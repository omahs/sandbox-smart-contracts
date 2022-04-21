// eslint-disable-next-line @typescript-eslint/no-var-requires
import {parseEther} from 'ethers/lib/utils';
import {BigNumber} from 'ethers';
import {avatarSaleSignature} from '../../test/common/signatures';
import {ethers, getNamedAccounts} from 'hardhat';
import {getArgParser} from '../utils/utils';
import {ifNotMumbaiThrow} from '../utils/matic';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const argparse = require('argparse');

async function main() {
  ifNotMumbaiThrow();

  const backendPk = process.env.BACKEND_PK;
  if (!backendPk) {
    throw new Error(`Set the env var BACKEND_PK`);
  }
  const pk = process.env.USER_PK;
  if (!pk) {
    throw new Error(`Set the env var USER_PK`);
  }
  const parser = getArgParser({
    description: `RUN WITH: yarn execute mumbai ${process.argv[0]}`,
  });
  parser.addArgument(['-p', '--price'], {help: 'price', defaultValue: '5'});
  parser.addArgument(['tokens'], {
    help: 'token ids',
    nargs: argparse.Const.ONE_OR_MORE,
  });
  parser.addFlag(['-a', '--approve'], {help: 'call approve'});
  parser.addFlag(['-n', '--dry', '--dry-run'], {help: 'dry run'});
  const processArgs = parser.parseArgs();

  const backendAuthEtherWallet = new ethers.Wallet(backendPk);
  const wallet = new ethers.Wallet(pk, ethers.provider);
  const tokenIds = processArgs.tokens.map((x: string) => BigNumber.from(x));
  const price = parseEther(processArgs.price);
  const {sandboxAccount} = await getNamedAccounts();

  const avatarSaleContract = await ethers.getContract(
    'PolygonAvatarSale',
    wallet
  );
  console.log('Avatar sale', avatarSaleContract.address);

  const {v, r, s} = await avatarSaleSignature(
    avatarSaleContract,
    backendAuthEtherWallet.address,
    wallet.address,
    tokenIds,
    sandboxAccount,
    price,
    backendAuthEtherWallet.privateKey
  );
  const args = [v, r, s, wallet.address, tokenIds, sandboxAccount, price];

  const avatarToken = await ethers.getContract('PolygonAvatar', wallet);
  const avatartTokenAddr = await avatarSaleContract.avatarTokenAddress();
  if (avatarToken.address != avatartTokenAddr) {
    throw new Error(
      `Avatar token address don't match ${avatarToken.address} != ${avatartTokenAddr}`
    );
  }
  console.log('Avatar token', avatartTokenAddr);

  const sandContract = await ethers.getContract('PolygonSand', wallet);
  const sandTokenAddress = await avatarSaleContract.sandTokenAddress();
  if (sandContract.address != sandTokenAddress) {
    throw new Error(
      `Sand token address don't match ${sandContract.address} != ${sandTokenAddress}`
    );
  }
  console.log('Sand token', sandTokenAddress);

  const MINTER_ROLE = await avatarToken.MINTER_ROLE();
  const hasMinterRole = await avatarToken.hasRole(
    MINTER_ROLE,
    avatarSaleContract.address
  );
  if (!hasMinterRole) {
    throw new Error(`Invalid minter ${avatarSaleContract.address}`);
  }

  const maxMinLength = BigNumber.from(await avatarToken.maxMinLength());
  if (tokenIds.length == 0 || maxMinLength.lt(tokenIds.length)) {
    throw new Error(
      `Cannot mint more than ${maxMinLength} ids in one step got ${tokenIds.length}`
    );
  }

  const SIGNER_ROLE = await avatarSaleContract.SIGNER_ROLE();
  const hasSignerRole = await avatarSaleContract.hasRole(
    SIGNER_ROLE,
    backendAuthEtherWallet.address
  );
  if (!hasSignerRole) {
    throw new Error(`Invalid signer ${backendAuthEtherWallet.address}`);
  }

  const SELLER_ROLE = await avatarSaleContract.SELLER_ROLE();
  const hasSellerRole = await avatarSaleContract.hasRole(
    SELLER_ROLE,
    sandboxAccount
  );
  if (!hasSellerRole) {
    throw new Error(`Invalid seller ${sandboxAccount}`);
  }

  const verifyAddr = await avatarSaleContract.verify(...args);
  if (verifyAddr != backendAuthEtherWallet.address) {
    throw new Error(
      `Message signer ${verifyAddr} != ${
        backendAuthEtherWallet.address
      } does not verify ${JSON.stringify(args, null, 4)}`
    );
  }

  const balance = BigNumber.from(await sandContract.balanceOf(wallet.address));
  if (balance.lt(price)) {
    throw new Error(
      `User ${
        wallet.address
      } doesn't have enough balance, ${balance.toString()} < ${price.toString()}`
    );
  }

  if (processArgs.approve) {
    console.log('Calling approve');
    if (!processArgs.dry) {
      const approveTx = await sandContract.approve(
        avatarSaleContract.address,
        price
      );
      const approveTxResult = await approveTx.wait();
      console.log('Approve result', approveTxResult);
    }
  } else {
    const allowance = BigNumber.from(
      await sandContract.allowance(wallet.address, avatarSaleContract.address)
    );
    if (allowance.lt(price)) {
      throw new Error(
        `User ${wallet.address} doesn't have enough allowance for ${
          avatarSaleContract.address
        }, ${allowance.toString()} < ${price.toString()}`
      );
    }
  }

  if (!processArgs.dry) {
    console.log(
      'Calling avatarSaleContract.execute with args',
      args.map((x) => x.toString())
    );
    const executeTx = await avatarSaleContract.execute(...args);
    const executeTxResult = await executeTx.wait();
    console.log('Execute result', executeTxResult);
  }
}

if (require.main === module) {
  main().catch((err) => console.error(err));
}
