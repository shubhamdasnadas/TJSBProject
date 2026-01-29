import { NextResponse } from "next/server";
import axios from "axios";

const DSM = process.env.SYNOLOGY_URL!;

export async function POST(req: Request) {
  const { path, sid } = await req.json();

  const { data } = await axios.get(`${DSM}/webapi/entry.cgi`, {
    params: {
      api: "SYNO.FileStation.List",
      method: "list",
      version: 2,
      folder_path: path,
      _sid: sid,
    },
  });

  return NextResponse.json(data);
}