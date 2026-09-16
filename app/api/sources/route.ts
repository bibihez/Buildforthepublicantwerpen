import { fail, handleError } from '@/lib/http';
import { addSource, listSourceItems, parseUploadFields } from '@/lib/sources';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ sources: listSourceItems() });
}

/** multipart: file + SourceUploadFields → saved, ingested, indexed. A duplicate file is refused. */
export async function POST(request: Request) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail('Verwacht een formulier met een bestand', 400);
    }
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) return fail('Geen bestand gekozen', 400);
    const fields = parseUploadFields(form);
    const result = await addSource(fields, file.name, new Uint8Array(await file.arrayBuffer()));
    return Response.json(result);
  } catch (err) {
    return handleError('POST /api/sources', err);
  }
}
