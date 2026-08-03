import axios from 'axios';
import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';

const payloadSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .trim()
    .min(1, 'Email cannot be empty')
    .max(100, 'Email too long'),
  apiToken: yup
    .string()
    .required('API token is required')
    .min(1, 'API token cannot be empty')
    .max(500, 'API token too long')
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.POST(payloadSchema, async (req, res) => {
  try {
    const { email, apiToken } = req.payload;

    // Basic email validation
    if (!email?.trim() || !apiToken?.trim()) {
      return res.status(400).json({
        message: 'Email and API token are required'
      });
    }

    // Change this to the Atlassian Bitbucket Cloud REST API endpoint
    const url = 'https://api.bitbucket.org/2.0/user';

    const response = await axios({
      url,
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${email.trim()}:${apiToken}`
        ).toString('base64')}`,
        'User-Agent': 'MiddlewareApp/1.0',
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.headers) {
      return res.status(400).json({
        message: 'Unable to retrieve permission information from BitBucket'
      });
    }

    // Validate that we received user data
    if (!response.data || typeof response.data !== 'object') {
      return res.status(400).json({
        message: 'Invalid response from BitBucket API'
      });
    }

    // Check for required user fields to ensure authentication was successful
    if (!response.data.uuid || !response.data.username) {
      return res.status(400).json({
        message: 'Bitbucket authentication successful but user data incomplete'
      });
    }

    res.status(200).json({
      data: response.data,
      headers: response.headers
    });
  } catch (error: any) {
    console.error('Error fetching Bitbucket user:', {
      message: error.message,
      status: error.response?.status,
      hasCredentials: !!(req.payload?.email && req.payload?.apiToken),
      url: 'https://api.bitbucket.org/2.0/user'
    });

    const status = error.response?.status || 500;
    let message = 'Internal Server Error';

    switch (status) {
      case 401:
        message =
          'Invalid Bitbucket credentials. Please check your email and API Token.';
        break;
      case 403:
        message =
          'Access forbidden. Check your API Token permissions or ensure it has not expired.';
        break;
      case 404:
        message = 'Bitbucket user not found. Please verify your email.';
        break;
      case 429:
        message = 'Rate limit exceeded. Please try again later.';
        break;
      case 400:
        message = 'Bad request. Please check your credentials format.';
        break;
      default:
        message =
          error.response?.data?.error?.message ||
          error.message ||
          'Failed to validate Bitbucket credentials';
    }

    res.status(status).json({ message });
  }
});

export default endpoint.serve();
