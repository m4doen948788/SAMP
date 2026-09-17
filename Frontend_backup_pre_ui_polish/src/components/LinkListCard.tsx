import React from 'react';

interface LinkListCardProps {
  title: string;
  links: { label: string; href: string }[];
}

const LinkListCard: React.FC<LinkListCardProps> = ({ title, links }) => {
  return (
    <div className="bg-white shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="card-title text-center">{title}</div>
      <div className="p-2 flex-1">
        <ul className="space-y-1">
          {links.map((link, idx) => (
            <li key={idx} className="border-b border-slate-100 last:border-0 pb-1">
              <a href={link.href} className="text-[10px] text-blue-600 hover:underline">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LinkListCard;
