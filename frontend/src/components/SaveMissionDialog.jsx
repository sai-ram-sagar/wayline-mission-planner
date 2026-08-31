import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './Modal';

// Matches the name/description rules in backend/lib/schemas.js.
const saveSchema = z.object({
  name: z.string().trim().min(1, 'Give the mission a name.').max(120, 'Keep the name under 120 characters.'),
  description: z.string().trim().max(1000, 'Keep the description under 1000 characters.'),
});

export default function SaveMissionDialog({
  open,
  initialName,
  initialDescription,
  isUpdate,
  saving,
  error,
  onSubmit,
  onCancel,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(saveSchema),
    values: { name: initialName ?? '', description: initialDescription ?? '' },
  });

  return (
    <Modal
      open={open}
      title={isUpdate ? 'Update wayline' : 'Save wayline'}
      onClose={saving ? undefined : onCancel}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            form="save-mission-form"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : isUpdate ? 'Update' : 'Save'}
          </button>
        </>
      }
    >
      <form id="save-mission-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="field-label" htmlFor="mission-name">
            Name
          </label>
          <input
            id="mission-name"
            className="input"
            autoFocus
            placeholder="Warehouse perimeter sweep"
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-[11px] text-red-400">{errors.name.message}</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="mission-description">
            Description
          </label>
          <textarea
            id="mission-description"
            className="input min-h-[72px] resize-y"
            placeholder="What this mission covers, and anything the pilot should know."
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-[11px] text-red-400">{errors.description.message}</p>
          )}
        </div>

        {error && (
          <p className="rounded border border-red-900/60 bg-red-950/50 px-2 py-1.5 text-[11px] text-red-300">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
