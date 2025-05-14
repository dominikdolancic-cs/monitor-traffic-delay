import 'dotenv/config';
import { Client, DistanceMatrixRowElement } from '@googlemaps/google-maps-services-js';
import OpenAI from 'openai';
import { GeneratedMessage, TrafficDataResponse } from './types';
import { Twilio } from 'twilio';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';

const googleMapsClient = new Client({});
const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Fetching traffic data from the Google API based on the given route with the departure time
 * @param origins - The starting point for calculating travel distance and time
 * @param destinations - The finishing point for calculating travel distance and time
 * @param departure_time - The time when the route starts
 * @returns {TrafficDataResponse} - Google API status with historicalDuration, and liveDuration from the traffic in the given route
 */
export function fetchTrafficData(
  origins: string[],
  destinations: string[],
  departure_time?: number,
): Promise<TrafficDataResponse> {
  return googleMapsClient
    .distancematrix({
      params: {
        departure_time,
        origins,
        destinations,
        key: process.env.MAPS_API_KEY || '',
      },
    })
    .then((r) => {
      const element: DistanceMatrixRowElement = r?.data?.rows[0]?.elements[0];
      const historicalDuration: number = element?.duration?.value;
      const liveDuration: number = element?.duration_in_traffic?.value;
      const status: string = element?.status;
      return { historicalDuration, liveDuration, status };
    })
    .catch((e) => {
      return e;
    });
}

/**
 * Calculate the delay from the given two duration times, convert them from seconds to minutes,
 * and return the time of the delay based on the threshold.
 * @param duration - Specifies the assumptions to use when calculating time in traffic.
 * @param duration_in_traffic - Specifies the predicted time in traffic based on historical averages.
 * @param threshold - Time in minutes we want to use to notify the delay
 * @returns {number} - The delay time converted in minutes type number
 */
export async function checkDelayExceedsThreshold(
  duration: number,
  duration_in_traffic: number,
  threshold: number,
): Promise<number> {
  const delayTime: number = Math.floor(duration_in_traffic / 60) - Math.floor(duration / 60);
  return delayTime > threshold ? delayTime : 0;
}

/**
 * Generates a friendly message for the customer with an emoji from AI
 * @param delayTime - The delay time for the generic message
 * @returns {GeneratedMessage} - The text message that includes the delay time in the string type.
 */
export async function generateNotificationForCustomerAboutDelay(delayTime: number): Promise<GeneratedMessage> {
  const completion = await openAIClient.chat.completions
    .create({
      messages: [
        {
          role: 'system',
          content:
            'Generating a friendly, delay-related SMS message with delay time and emoji for the customer of the company name Deliverio.',
        },
        {
          role: 'user',
          content: `Delivery will be delayed by time ${delayTime} in minutes.`,
        },
      ],
      model: 'gpt-4o-mini',
    })
    .catch((error) => {
      if (error instanceof OpenAI.APIError) {
        console.error(error);
        throw error;
      } else {
        return error;
      }
    });
  const generatedMessage: GeneratedMessage = completion?.choices[0]?.message?.content;
  return generatedMessage;
}

/**
 * Sends the SMS message to the customer using the Twilio service
 * @param body - The text message that needs to be sent to the customer
 * @returns {MessageInstance} - Twilio message instance
 */
export async function sendSMSNotificationToCustomerAboutDelay(body: string): Promise<MessageInstance> {
  const message: MessageInstance = await twilioClient.messages.create({
    body,
    from: process.env.TWILIO_NUMBER_FROM || '',
    to: process.env.TWILIO_NUMBER_TO || '',
  });
  return message;
}
