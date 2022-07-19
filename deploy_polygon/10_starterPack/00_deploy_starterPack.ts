import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    starterPackAdmin,
    starterPackSaleBeneficiary,
    backendMessageSigner,
  } = await getNamedAccounts();

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');

  const sandContract = await deployments.get('Sand');

  // const catalystGroup = await deployments.get('Catalyst'); // TODO:
  // const gemGroup = await deployments.get('Gem'); // TODO:

  await deploy('PolygonStarterPack', {
    contract: 'StarterPackV2',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      starterPackAdmin,
      sandContract.address,
      TRUSTED_FORWARDER_V2.address,
      starterPackSaleBeneficiary,
      catalystAddresses,
      gemAddresses,
      backendMessageSigner,
      catalystPrices,
      gemPrices,
    ],
  });
};
export default func;
func.tags = ['PolygonStarterPack', 'PolygonStarterPack_deploy', 'L2'];
