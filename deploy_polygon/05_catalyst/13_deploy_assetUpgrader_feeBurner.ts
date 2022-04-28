import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';
import {upgradeFee, gemAdditionFee} from '../../data/assetUpgraderFees';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy, execute, read} = deployments;

  // const PolygonSand = await deployments.get('PolygonSand');
  // const PolygonAssetERC1155_deploy = await deployments.get(
  //   'PolygonAssetERC1155_deploy'
  // );

  // TODO: fix for new Polygon deployment

  // const GemsCatalystsRegistry = await deployments.get('GemsCatalystsRegistry');

  // const {deployer, assetAttributesRegistryAdmin} = await getNamedAccounts();
  // const BURN_ADDRESS = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF';

  // // @note For testing fee-burning only
  // const chainId = await getChainId();
  // if (chainId == '31337') {
  //   await deploy(`MockAssetAttributesRegistry`, {
  //     from: deployer,
  //     log: true,
  //     args: [
  //       GemsCatalystsRegistry.address,
  //       assetAttributesRegistryAdmin,
  //       assetAttributesRegistryAdmin,
  //       assetAttributesRegistryAdmin,
  //     ],
  //   });

  //   const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  //   const MockAssetAttributesRegistry = await deployments.get(
  //     'MockAssetAttributesRegistry'
  //   );
  //   await deploy(`AssetUpgraderFeeBurner`, {
  //     from: deployer,
  //     log: true,
  //     args: [
  //       MockAssetAttributesRegistry.address,
  //       Sand.address,
  //       Asset.address, // TODO: asset contract split
  //       Asset.address, // TODO: asset contract split
  //       GemsCatalystsRegistry.address,
  //       upgradeFee,
  //       gemAdditionFee,
  //       BURN_ADDRESS,
  //       TRUSTED_FORWARDER.address,
  //     ],
  //   });

  //   const upgraderFeeBurner = await deployments.get('AssetUpgraderFeeBurner');
  //   const currentSandAdmin = await read('Sand', 'getAdmin');
  //   await execute(
  //     'Sand',
  //     {from: currentSandAdmin, log: true},
  //     'setSuperOperator',
  //     upgraderFeeBurner.address,
  //     true
  //   );

  //   const currentAdmin = await read('GemsCatalystsRegistry', 'getAdmin');
  //   await execute(
  //     'GemsCatalystsRegistry',
  //     {from: currentAdmin, log: true},
  //     'setSuperOperator',
  //     upgraderFeeBurner.address,
  //     true
  //   );
  // }
};
export default func;
func.tags = [
  'PolygonAssetUpgraderFeeBurner',
  'PolygonAssetUpgraderFeeBurner_deploy',
  'PolygonAssetUpgraderFeeBurner_setup',
];
func.dependencies = [
  // 'AssetAttributesRegistry_deploy',
  'PolygonSand_deploy',
  'PolygonAssetERC1155_deploy',
  // 'GemsCatalystsRegistry_deploy',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTest; // TODO remove this deployment if this is just for test
