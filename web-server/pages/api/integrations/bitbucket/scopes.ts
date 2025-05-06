import { Endpoint, nullSchema } from '@/api-helpers/global';
import { handleRequest } from '@/api-helpers/axios';
import * as yup from 'yup';

const payloadSchema = yup.object({
  username: yup.string().required('Username is required'),
  appPassword: yup.string().required('App password is required'),
  customDomain: yup.string().url('Custom domain must be a valid URL'),
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.POST(payloadSchema, async (req, res) => {
  try {
    const { username, appPassword, customDomain } = req.payload;
    const baseUrl = customDomain || 'https://api.bitbucket.org/2.0';
    const url = `${baseUrl}/user`;
    const response = await handleRequest(url, {
      method: 'GET',
      auth: {
        username,
        password: appPassword,
      },
    },true);

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching Bitbucket user:', error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.error?.message || 'Internal Server Error',
    });
  }
});

export default endpoint.serve();