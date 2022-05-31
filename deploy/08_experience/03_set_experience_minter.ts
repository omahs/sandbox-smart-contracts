import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {gameTokenAdmin} = await getNamedAccounts();

  const gameMinter = await deployments.get('ExperienceMinter');

  const currentMinter = await read('Experience', 'getMinter');
  const isMinter = currentMinter == gameMinter.address;

  if (!isMinter) {
    await execute(
      'Experience',
      {from: gameTokenAdmin, log: true},
      'changeMinter',
      gameMinter.address
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['Experience', 'Experience_setup'];
func.dependencies = ['Experience_deploy', 'ExperienceMinter_deploy'];
// TODO: Setup deploy-polygon folder and network.
func.skip = skipUnlessTest; // TODO enable
