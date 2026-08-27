interface Props {
  title: string;
  body: string;
}

/**
 * Empty and loading screens both use this. Copy rule: say what happens next,
 * never apologise, never pad with mood.
 */
export function Placeholder({ title, body }: Props) {
  return (
    <div className="placeholder" role="status">
      <p className="placeholder__title">{title}</p>
      <p className="placeholder__body">{body}</p>
    </div>
  );
}
