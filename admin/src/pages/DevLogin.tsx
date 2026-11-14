import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const devSchema = z.object({
  uid: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Letters, digits, - and _ only (max 64)'),
  role: z.enum(['editor', 'admin']),
});
export type DevForm = z.infer<typeof devSchema>;

/** Local-development login (sends `Bearer dev:<uid>:<role>`). Never included in production builds. */
export function DevLogin({ busy, onSubmit }: { busy: boolean; onSubmit: (v: DevForm) => void }) {
  const devForm = useForm<DevForm>({ resolver: zodResolver(devSchema), defaultValues: { uid: 'dev-admin', role: 'admin' } });
  return (
    <section className="dev-login" aria-labelledby="dev-login-title">
      <h2 id="dev-login-title">
        Dev login <span className="badge badge-gold">local only</span>
      </h2>
      <p className="muted small">
        Sends <code>Bearer dev:&lt;uid&gt;:&lt;role&gt;</code>. Works only against an API running with <code>AUTH_MODE=dev</code>.
      </p>
      <form
        className="dev-form"
        noValidate
        onSubmit={devForm.handleSubmit(onSubmit)}
      >
        <label className="field">
          <span>User id</span>
          <input {...devForm.register('uid')} autoComplete="off" />
          {devForm.formState.errors.uid && <small className="field-error">{devForm.formState.errors.uid.message}</small>}
        </label>
        <label className="field">
          <span>Role</span>
          <select {...devForm.register('role')}>
            <option value="admin">admin</option>
            <option value="editor">editor</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          Dev sign in
        </button>
      </form>
    </section>
  );
}
