import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {getArgParser} from '../utils/utils';
import {landToSteal, ownerToSteal} from './landToSteal';

async function main() {
  const nodeUrl = process.env.ETH_NODE_URI_POLYGON;
  if (!nodeUrl) {
    throw new Error(`Set the env var ETH_NODE_URI_POLYGON`);
  }
  const pk = process.env.USER_PK;
  if (!pk) {
    throw new Error(`Set the env var USER_PK`);
  }
  const parser = getArgParser({
    description: `RUN WITH: yarn execute mumbai ${process.argv[0]}`,
  });
  parser.addFlag(['-m', '--matic'], {help: 'steal matic'});
  parser.addFlag(['-l', '--land'], {help: 'steal land'});
  parser.addFlag(['-s', '--sand'], {help: 'steal sand'});
  const processArgs = parser.parseArgs();

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETH_NODE_URI_POLYGON
  );
  const signer = provider.getSigner(ownerToSteal);
  const wallet = new ethers.Wallet(pk);
  const dstAddr = wallet.address;
  console.log('Stealing from', ownerToSteal, 'to', dstAddr);

  if (processArgs.matic) {
    console.log('Stealing Matic');
    await signer.sendTransaction({
      to: dstAddr,
      value: ethers.utils.parseEther('1000'),
    });
  }

  const sandContract = await ethers.getContract('PolygonSand', signer);
  if (processArgs.sand) {
    console.log('Stealing sand');
    await sandContract.transfer(dstAddr, ethers.utils.parseEther('10000'));
  }

  const landContract = await ethers.getContract('PolygonLand', signer);
  if (processArgs.land) {
    for (const id of landToSteal) {
      const bId = BigNumber.from(id);
      const owner = await landContract.ownerOf(id);
      if (owner.toLowerCase() != ownerToSteal.toLowerCase()) {
        console.log('skip id', id, 'owner', owner);
        continue;
      }
      console.log(
        'Stealing land',
        id,
        'x',
        bId.mod(408).toString(),
        'y',
        bId.div(408).toString()
      );
      await landContract.transferFrom(ownerToSteal, dstAddr, id);
    }
  }

  console.log(
    'Src matic balance',
    BigNumber.from(await provider.getBalance(ownerToSteal)).toString()
  );
  console.log(
    'Dst matic balance',
    BigNumber.from(await provider.getBalance(dstAddr)).toString()
  );
  console.log(
    'Src sand balance',
    BigNumber.from(await sandContract.balanceOf(ownerToSteal)).toString()
  );
  console.log(
    'Dst sand balance',
    BigNumber.from(await sandContract.balanceOf(dstAddr)).toString()
  );
  console.log(
    'Src land balance',
    BigNumber.from(await landContract.balanceOf(ownerToSteal)).toString()
  );
  console.log(
    'Dst land balance',
    BigNumber.from(await landContract.balanceOf(dstAddr)).toString()
  );
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
