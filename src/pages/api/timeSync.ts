export const runtime = "edge";

import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
    time: string;
};

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>,
) {
    res.status(200).json({ time: Date.now().toString() });
}
