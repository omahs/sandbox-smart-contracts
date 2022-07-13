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
  let oldId;
  const sizesTooAdd: BigNumberish[] = [];
  const xsTooAdd: BigNumberish[] = [];
  const ysTooAdd: BigNumberish[] = [];
  const expToUnlink: BigNumberish[] = [];
  const sizesTooRemove: BigNumberish[] = [];
  const xsTooRemove: BigNumberish[] = [];
  const ysTooRemove: BigNumberish[] = [];

  if (args.length % 8 != 0) {
    console.log(
      'Usage: cmd id size x y ... size x y expIds size x y ... size x y'
    );
    process.exit();
  }
  for (let i = 0; i < args.length; i++) {
    oldId = args[i++];
    sizesTooAdd.push(args[i++]);
    xsTooAdd.push(args[i++]);
    ysTooAdd.push(args[i++]);
    expToUnlink.push(args[i++]);
    sizesTooRemove.push(args[i++]);
    xsTooRemove.push(args[i++]);
    ysTooRemove.push(args[i++]);
  }

  console.log(
    'Calling update',
    oldId,
    sizesTooAdd,
    xsTooAdd,
    ysTooAdd,
    expToUnlink,
    sizesTooRemove,
    xsTooRemove,
    ysTooRemove
  );
  const estateContact = await ethers.getContract('PolygonEstate', wallet);
  const tx = await estateContact.update(
    oldId,
    [sizesTooAdd, xsTooAdd, ysTooAdd],
    expToUnlink,
    [sizesTooRemove, xsTooRemove, ysTooRemove]
  );
  const receipt = await tx.wait();
  const events = receipt.events.filter(
    (v: Event) => v.event === 'EstateTokenUpdated'
  );
  const newEstateId = BigNumber.from(events[0].args['newId']);
  console.log(
    'Estate updated, estateId',
    newEstateId.toString(),
    newEstateId.toHexString(),
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
