export default function RichText({ blocks = [] }) {
  return (
    <div className="space-y-4 text-base leading-7 text-slate-600">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return <h3 key={`${block.text}-${index}`} className="pt-3 text-xl font-bold text-slate-900">{block.text}</h3>;
        }

        if (block.type === 'list') {
          return (
            <ul key={`${block.items.join('-')}-${index}`} className="list-disc space-y-2 pl-5 marker:text-green-500">
              {block.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          );
        }

        if (block.type === 'quote') {
          return <blockquote key={`${block.text}-${index}`} className="border-l-4 border-green-400 pl-5 italic text-slate-700">{block.text}</blockquote>;
        }

        return <p key={`${block.text}-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}