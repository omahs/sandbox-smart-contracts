import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getUnnamedAccounts} = hre;
  const {deploy} = deployments;

  const {
    deployer,
    assetAdmin,
    assetAuctionFeeCollector,
  } = await getNamedAccounts();
  const others = await getUnnamedAccounts();

  const authValidatorContract = await deployments.get('PolygonAuthValidator');
  const assetContract = await deployments.get('PolygonAssetERC1155');
  const PolygonLand = await deployments.get('PolygonLand');

  await deploy('PolygonAssetSignedAuctionWithAuth', {
    from: deployer,
    contract: 'AssetSignedAuctionWithAuth',
    args: [
      assetContract.address,
      PolygonLand.address,
      assetAdmin,
      others[0],
      assetAuctionFeeCollector,
      200,
      authValidatorContract.address,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'PolygonAssetSignedAuctionWithAuth',
  'PolygonAssetSignedAuctionWithAuth_deploy',
  'PolygonAsset',
  'L2',
];
func.dependencies = [
  'PolygonAssetERC1155_deploy',
  'PolygonLand_deploy',
  'PolygonAuthValidator_deploy',
];
func.skip = skipUnlessTest;
