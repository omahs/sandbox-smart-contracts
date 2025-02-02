import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read('RaffleCareBears', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('RaffleCareBears', 'owner');
    await catchUnknownSigner(
      execute(
        'RaffleCareBears',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = [
  'RaffleCareBears',
  'RaffleCareBears_setup',
  'RaffleCareBears_setup_minter',
];
func.dependencies = ['PolygonSand', 'RaffleCareBears_deploy'];
