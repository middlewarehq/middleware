import { Endpoint, nullSchema } from '@/api-helpers/global';
import { handleRequest } from '@/api-helpers/axios';
import * as yup from 'yup';

const payloadSchema = yup.object({
  username: yup
    .string()
    .required('Username is required')
    .trim()
    .min(1, 'Username cannot be empty')
    .max(100, 'Username too long'),
  appPassword: yup
    .string()
    .required('App password is required')
    .min(1, 'App password cannot be empty')
    .max(500, 'App password too long')
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.POST(payloadSchema, async (req, res) => {
  try {
    const { username, appPassword } = req.payload;
    const sanitizedUsername = username.replace(/[^\w.-]/g, '');
    
    if (sanitizedUsername !== username) {
      return res.status(400).json({
        message: 'Invalid username format. Only alphanumeric characters, dots, and hyphens are allowed.'
      });
    }
    
    const url = 'https://api.bitbucket.org/2.0/user';
    
    const response = await handleRequest(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sanitizedUsername}:${appPassword}`).toString('base64')}`,
        'User-Agent': 'MiddlewareApp/1.0'
      },
      timeout: 10000
    }, true);

    if (!response.headers) {
      return res.status(400).json({
        message: 'Unable to retrieve permission information from BitBucket'
      });
    }

    res.status(200).json({
      ...response,
      headers: response.headers
    });
  } catch (error: any) {
    console.error('Error fetching Bitbucket user:', {
      message: error.message,
      status: error.response?.status,
      hasCredentials: !!(req.payload?.username && req.payload?.appPassword)
    });
    
    const status = error.response?.status || 500;
    let message = 'Internal Server Error';
    
    switch (status) {
      case 401:
        message = 'Invalid BitBucket credentials';
        break;
      case 403:
        message = 'Access forbidden. Check your App Password permissions';
        break;
      case 404:
        message = 'BitBucket user not found';
        break;
      case 429:
        message = 'Rate limit exceeded. Please try again later';
        break;
      default:
        message = error.response?.data?.error?.message || message;
    }
    
    res.status(status).json({ message });
  }
});

export default endpoint.serve();