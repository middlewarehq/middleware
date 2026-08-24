import { head } from 'ramda';
import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Columns, Table } from '@/constants/db';
import { db } from '@/utils/db';

// CLUSTOX: hardcoded for the same reason as the invite link -- this was built
// from NEXTAUTH_URL, which the server's .env still sets to localhost, so a
// share link generated server-side pointed at a host the recipient cannot
// reach. Only used when the client does not send its own base_url.
// See pages/api/clustox/invites/index.ts.
const APP_URL = 'https://middleware.theclustox.com';

const getSchema = yup.object().shape({
  share_link_id: yup.string().required()
});

const postSchema = yup.object().shape({
  link_json: yup.object().required(),
  base_url: yup.string().optional()
});

// CLUSTOX: was unauthenticated, which let anyone POST unbounded rows into
// URLShortenerData and read stored link state. Everyone who should open a
// share link has an account, so requiring one costs nothing.
const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { share_link_id } = req.payload;
  const data = await db(Table.URLShortenerData)
    .select(Columns[Table.URLShortenerData].meta)
    .where(Columns[Table.URLShortenerData].id, share_link_id)
    .first();

  res.send({ data });
});

endpoint.handle.POST(postSchema, async (req, res) => {
  const { link_json, base_url } = req.payload;
  // insert meta and json string

  try {
    const data = await db(Table.URLShortenerData)
      .insert({
        [Columns[Table.URLShortenerData].url_json_string]: '',
        [Columns[Table.URLShortenerData].meta]: link_json
      })
      .returning(Columns[Table.URLShortenerData].id);

    const id = head(data)?.id;

    if (!id) {
      throw new Error('failed to generate share-link');
    }

    const response = { url: '' };

    let shareLink = '';
    if (base_url) {
      shareLink = `${base_url}?share=${id}`;
      response.url = shareLink;
      res.send(response);
    }
    shareLink = `${APP_URL}?share=${id}`;
    response.url = shareLink;
    res.send(response);
  } catch (e) {
    res.status(500).send({ error: 'failed to generate share-link' });
  }
});

export default endpoint.serve();
