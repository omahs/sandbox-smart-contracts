import {ethers} from 'hardhat';
import {BigNumber, BigNumberish} from 'ethers';
import {Event} from '@ethersproject/contracts';
import {printTileWithCoord, tileWithCoordToJS} from '../../test/map/fixtures';

async function main() {
  const nodeUrl = process.env.ETH_NODE_URI_POLYGON;
  if (!nodeUrl) {
    throw new Error(`Set the env var ETH_NODE_URI_POLYGON`);
  }
  const pk = process.env.USER_PK;
  if (!pk) {
    throw new Error(`Set the env var USER_PK`);
  }
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETH_NODE_URI_POLYGON
  );
  const wallet = new ethers.Wallet(pk, provider);

  const args = process.argv.slice(process.argv.indexOf(__filename) + 1);
  const sizes: BigNumberish[] = [];
  const xs: BigNumberish[] = [];
  const ys: BigNumberish[] = [];
  if (args.length % 3 != 0) {
    console.log('Usage: cmd size x y ... size x y');
    process.exit();
  }
  for (let i = 0; i < args.length; i++) {
    sizes.push(args[i++]);
    xs.push(args[i++]);
    ys.push(args[i++]);
  }

  console.log('Calling create', sizes, xs, ys);
  const estateContact = await ethers.getContract('PolygonEstate', wallet);
  const tx = await estateContact.create([sizes, xs, ys]);
  const receipt = await tx.wait();
  const events = receipt.events.filter(
    (v: Event) => v.event === 'EstateTokenCreated'
  );
  const estateId = BigNumber.from(events[0].args['estateId']);
  console.log(
    'Estate created, estateId',
    estateId.toString(),
    estateId.toHexString(),
    'user',
    events[0].args['user'],
    'gas used',
    BigNumber.from(receipt.gasUsed).toString()
  );
  const lands = events[0].args['lands'];
  for (const l of lands) {
    printTileWithCoord(tileWithCoordToJS(l));
  }
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
