export type ActionState = {
  status: 'idle' | 'error';
  message?: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = { status: 'idle', message: null };
