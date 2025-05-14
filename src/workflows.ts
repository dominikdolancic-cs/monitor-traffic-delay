import * as workflow from '@temporalio/workflow';
import type * as activities from './activities';
import { TrafficDataResponse, NotificationStatus, GeneratedMessage } from './types';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';
import { THRESHOLD } from './shared';

const {
  fetchTrafficData,
  checkDelayExceedsThreshold,
  generateNotificationForCustomerAboutDelay,
  sendSMSNotificationToCustomerAboutDelay,
} = workflow.proxyActivities<typeof activities>({
  retry: {
    initialInterval: '1 second',
    maximumInterval: '1 minute',
    backoffCoefficient: 2,
  },
  startToCloseTimeout: '1 minute',
});

/**
 * Monitor the traffic delays using the workflows on a freight delivery route and notify a customer if a significant delay occurs.
 * @param origins - Starting point for calculating distance and travel time in a format accepted by Google Maps
 * @param destinations - End point for calculating distance and travel time in a format that Google Maps accepts
 * @param departure_time - Time of the route starting
 * @returns {NotificationStatus} - Status of the sent notification based on the delay
 */
export async function checkFreightDeliveryForDelayAndNotify(
  origins: string[],
  destinations: string[],
  departure_time?: number,
): Promise<NotificationStatus> {
  try {
    const notificationStatus: NotificationStatus = { sent: false };
    const trafficData: TrafficDataResponse = await fetchTrafficData(origins, destinations, departure_time);
    if (trafficData.status !== 'OK') {
      throw new Error(`Failed to get trafficData from google API`);
    }

    const delayTime: number = await checkDelayExceedsThreshold(
      trafficData.historicalDuration,
      trafficData.liveDuration,
      THRESHOLD,
    );

    if (delayTime > 0) {
      const notificationMessage: GeneratedMessage = await generateNotificationForCustomerAboutDelay(delayTime);
      if (notificationMessage) {
        const message: MessageInstance = await sendSMSNotificationToCustomerAboutDelay(notificationMessage);
        if (message.sid) {
          notificationStatus.sent = true;
        }
      }
    }

    return notificationStatus;
  } catch (error) {
    throw new workflow.ApplicationFailure(`${error}`);
  }
}
