import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    deployer,
    upgradeAdmin,
    assetAdmin,
    assetBouncerAdmin,
  } = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const CHILD_CHAIN_MANAGER = await deployments.get('CHILD_CHAIN_MANAGER');

  const assetHelperLib = await deploy('AssetHelper', {
    from: deployer,
  });

  const ERC1155ERC721HelperLib = await deploy('ERC1155ERC721Helper', {
    from: deployer,
  });

  await deploy('PolygonAssetERC1155', {
    from: deployer,
    contract: 'PolygonAssetERC1155',
    libraries: {
      AssetHelper: assetHelperLib.address,
      ERC1155ERC721Helper: ERC1155ERC721HelperLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          TRUSTED_FORWARDER.address,
          assetAdmin,
          assetBouncerAdmin,
          assetAdmin,
          CHILD_CHAIN_MANAGER.address,
          1,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['PolygonAssetERC1155', 'PolygonAssetERC1155_deploy', 'L2'];
func.dependencies = ['TRUSTED_FORWARDER', 'CHILD_CHAIN_MANAGER'];
func.skip = skipUnlessTestnet;
