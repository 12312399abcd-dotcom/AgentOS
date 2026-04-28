export function verifyCron(req: Request) {
  const authHeader = req.headers.get('authorization')
  return Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`
}
