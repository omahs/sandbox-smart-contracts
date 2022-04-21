import hre, {ethers} from 'hardhat';
import {getArgParser} from '../utils/utils';
import {BigNumber} from 'ethers';
import {ifNotMumbaiThrow} from '../utils/matic';
import {getContractFromDeployment} from '../../utils/companionNetwork';

async function main() {
  ifNotMumbaiThrow();

  const pk = process.env.USER_PK;
  if (!pk) {
    throw new Error(`Set the env var USER_PK`);
  }
  const parser = getArgParser({
    description: `RUN WITH: yarn execute mumbai ${process.argv[0]}`,
  });
  parser.addArgument(['token'], {help: 'token id'});
  parser.addFlag(['-a', '--approve'], {help: 'call approve'});
  const processArgs = parser.parseArgs();
  const tokenId = BigNumber.from(processArgs.token);
  const wallet = new ethers.Wallet(pk);

  const goerliAvatarTunnel = await getContractFromDeployment(
    hre.companionNetworks['l1'],
    'AvatarTunnel',
    wallet
  );
  const goerliAvatar = await getContractFromDeployment(
    hre.companionNetworks['l1'],
    'Avatar',
    wallet
  );

  if (processArgs.approve) {
    console.log('Calling approve');
    const approveTx = await goerliAvatar.approve(
      goerliAvatarTunnel.address,
      tokenId
    );
    const approveTxResult = await approveTx.wait();
    console.log('approveTxResult', approveTxResult);
  }
  console.log('Calling goerliAvatarTunnel.sendAvatarToL2');
  const depositForTx = await goerliAvatarTunnel.sendAvatarToL2(
    wallet.address,
    tokenId
  );
  const depositForResult = await depositForTx.wait();
  console.log('depositForResult', depositForResult);
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
