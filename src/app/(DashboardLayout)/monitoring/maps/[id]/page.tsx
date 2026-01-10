"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import ZabbixMap from '../../../../components/widgets/ZabbixMap';

export default function Page() {
  const params = useParams();
  const id = String((params as any)?.id ?? '');

  return <ZabbixMap mapId={id} />;
}
