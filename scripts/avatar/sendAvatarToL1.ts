import {ethers} from 'hardhat';
import {getArgParser} from '../utils/utils';
import {BigNumber} from 'ethers';
import {ifNotMumbaiThrow} from '../utils/matic';

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
  const processArgs = parser.parseArgs();

  const wallet = new ethers.Wallet(pk, ethers.provider);
  const tokenId = BigNumber.from(processArgs.token);

  const avatarTunnelContract = await ethers.getContract(
    'PolygonAvatarTunnel',
    wallet
  );
  console.log('avatarTunnelContract', avatarTunnelContract.address);

  const avatarContract = await ethers.getContract('PolygonAvatar', wallet);
  console.log('avatarContract', avatarContract.address);

  console.log('calling avatarContract.approve');
  const approveTx = await avatarContract.approve(
    avatarTunnelContract.address,
    tokenId
  );
  const approveTxResult = await approveTx.wait();
  console.log('approve result', approveTxResult);

  console.log('calling avatarTunnelContract.sendAvatarToL1');
  const sendAvatarToL1Tx = await avatarTunnelContract.sendAvatarToL1(
    wallet.address,
    tokenId
  );
  const sendAvatarToL1TxResult = await sendAvatarToL1Tx.wait();
  console.log('sendAvatarToL1Tx result', sendAvatarToL1TxResult);

  console.log(
    'TRANSACTION HASH, USE IT TO CALL L1 Tunnel receiveAvatarFromL2',
    sendAvatarToL1Tx.hash
  );
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
