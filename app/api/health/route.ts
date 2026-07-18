export function GET() {
  return Response.json({
    ok: true,
    service: 'kmuntb-prachinburi-virtual-tour',
    version: '3.0.0'
  });
}
