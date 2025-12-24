export default async function TestPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return <div>Test page - Code: {code}</div>
}


