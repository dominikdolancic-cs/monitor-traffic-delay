import { Connection, Client } from '@temporalio/client';
import { nanoid } from 'nanoid';
import { TASK_QUEUE_NAME } from './shared';
import { checkFreightDeliveryForDelayAndNotify } from './workflows';

const origins = ['Zagreb'];
const destination = ['Berlin'];
const departure_time = new Date().getTime();

async function run() {
  const connection = await Connection.connect({ address: 'localhost:7233' });
  const client = new Client({
    connection,
  });

  const handle = await client.workflow.start(checkFreightDeliveryForDelayAndNotify, {
    taskQueue: TASK_QUEUE_NAME,
    args: [origins, destination, departure_time],
    workflowId: 'workflow-' + nanoid(),
  });
  console.log(`Started workflow ${handle.workflowId}`);
  console.log(await handle.result());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
