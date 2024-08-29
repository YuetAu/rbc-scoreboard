export const runtime = "edge";

import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
    message: string;
};

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    res.status(200).send(Date.now().toString());
}
