import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';
import {
  experienceMintingFee,
  experienceUpdateFee,
} from '../../data/experienceMinterFees';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenFeeBeneficiary} = await getNamedAccounts();
  const experienceContract = await deployments.get('Experience');
  const sandContract = await deployments.get('Sand');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  await deploy('ExperienceMinter', {
    from: deployer,
    log: true,
    args: [
      experienceContract.address,
      TRUSTED_FORWARDER.address,
      experienceMintingFee,
      experienceUpdateFee,
      gameTokenFeeBeneficiary,
      sandContract.address,
    ],
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['ExperienceMinter', 'ExperienceMinter_deploy'];
func.dependencies = ['Experience_deploy', 'Sand_deploy', 'TRUSTED_FORWARDER'];
// TODO: Setup deploy-polygon folder and network.
func.skip = skipUnlessTest; // TODO enable
