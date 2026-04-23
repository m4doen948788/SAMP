import React from 'react';
import { ArrowRight } from 'lucide-react';

interface LinkListCardProps {
  title: string;
  links: { label: string; href: string }[];
}

const LinkListCard: React.FC<LinkListCardProps> = ({ title, links }) => {
  return (
    <div className="card-modern flex flex-col h-full group/card transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
      <div className="px-5 py-4 border-b border-slate-50 bg-white group-hover/card:bg-indigo-50/30 transition-colors">
        <h2 className="text-[11px] font-black text-slate-800 tracking-widest uppercase text-center leading-tight">{title}</h2>
      </div>
      <div className="p-4 flex-1">
        <ul className="space-y-3">
          {links.map((link, idx) => (
            <li key={idx} className="group/item">
              <a
                href={link.href}
                className="flex items-start gap-2 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-all duration-300"
              >
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/item:bg-indigo-400 group-hover/item:scale-125 transition-all shrink-0" />
                <span className="flex-1 group-hover/item:translate-x-1 transition-transform duration-300 line-clamp-2">
                  {link.label}
                </span>
                <ArrowRight size={12} className="mt-0.5 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 text-indigo-500 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LinkListCard;
