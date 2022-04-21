import {BigNumber} from 'ethers';
import {avatarSaleSignature} from '../../test/common/signatures';
import {ethers, getNamedAccounts} from 'hardhat';
import {getArgParser} from '../utils/utils';
import {ifNotMumbaiThrow} from '../utils/matic';
import {parseEther} from 'ethers/lib/utils';
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

  const {v, r, s} = await avatarSaleSignature(
    avatarSaleContract,
    backendAuthEtherWallet.address,
    wallet.address,
    tokenIds,
    sandboxAccount,
    price,
    backendAuthEtherWallet.privateKey
  );
  console.log({
    signer: backendAuthEtherWallet.address,
    buyer: wallet.address,
    tokenIds: tokenIds.map((x: BigNumber) => x.toHexString()),
    seller: sandboxAccount,
    price: price.toHexString(),
    signature: {v, r, s},
  });
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
