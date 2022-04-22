require('dotenv').config();
const {ethers} = require('hardhat');
const {POSClient, use} = require('@maticnetwork/maticjs').default;
const {Web3ClientPlugin} = require('@maticnetwork/maticjs-ethers');
const {setProofApi} = require('@maticnetwork/maticjs');
const hre = require('hardhat');
const {ifNotMumbaiThrow} = require('../utils/matic');
const {getContractFromDeployment} = require('../../utils/companionNetwork');

async function delay(ms) {
  // eslint-disable-next-line no-undef
  return new Promise((resolve) => setTimeout(resolve, ms));
}

use(Web3ClientPlugin);
setProofApi('https://apis.matic.network/');

function patchProvider(provider) {
  // old versions of etherjs, specifically the one used by hardhat-deploy don't work !!!
  // the BaseProvider filters the type field and maticjs library uses it!!!
  const old = provider.formatter.receipt;
  provider.formatter.receipt = (value) => {
    const ret = old.bind(provider.formatter)(value);
    ret.type = value.type;
    return ret;
  };
  return provider;
}

async function main() {
  ifNotMumbaiThrow();

  const pk = process.env.USER_PK;
  if (!pk) {
    throw new Error('Set the USER_PK');
  }
  const mumbaiProvider = patchProvider(
    new ethers.providers.Web3Provider(hre.network.provider)
  );
  const mumbaiWallet = new ethers.Wallet(pk, mumbaiProvider);
  const goerliProvider = new ethers.providers.Web3Provider(
    hre.companionNetworks['l1'].provider
  );
  const goerliWallet = new ethers.Wallet(pk, goerliProvider);

  const avatarTunnelContract = await getContractFromDeployment(
    hre.companionNetworks['l1'],
    'AvatarTunnel',
    goerliWallet
  );
  console.log(
    'Mumbai addr',
    mumbaiWallet.address,
    'Goerli addr',
    goerliWallet.address,
    'Goerli Avatar tunnel addr',
    avatarTunnelContract.address
  );
  // Create sdk instance
  const maticPOSClient = new POSClient();
  await maticPOSClient.init({
    network: 'testnet', // For mainnet change this to mainnet
    version: 'mumbai', // For mainnet change this to v1
    parent: {
      provider: goerliWallet,
    },
    child: {
      provider: mumbaiWallet,
    },
  });
  const iface = new ethers.utils.Interface([
    'event MessageSent(bytes message)',
  ]);
  const topic = iface.encodeFilterTopics('MessageSent', []);
  const burnTxHash = process.argv[2]; //"0x8698e12b1e732615b1e3daf77dcf6df45c0d76b8cda7e868dabd845b3fb1cc6f";

  while (!(await maticPOSClient.isCheckPointed(burnTxHash))) {
    console.log(
      `Waiting for tx ${burnTxHash} to be checkpointed`,
      await maticPOSClient.exitUtil.getChainBlockInfo(burnTxHash)
    );
    await delay(3000);
  }
  const payload = await maticPOSClient.exitUtil.buildPayloadForExit(
    burnTxHash,
    topic[0],
    true
  );

  console.log('Calling receiveAvatarFromL2 for', burnTxHash);
  const tx = await avatarTunnelContract.receiveAvatarFromL2(payload);
  const txResult = await tx.wait();
  console.log('receiveAvatarFromL2 result', txResult);
}

main().catch((err) => console.error(err.message));
