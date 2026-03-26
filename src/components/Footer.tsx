import { Linkedin, Mail } from "lucide-react";

const Footer = () => {
  return <footer className="bg-[#0a1628] border-t border-cyan-500/20 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-8">
          {/* Social */}
          <div className="flex gap-4">
            <a href="https://www.linkedin.com/in/connectingtheworld/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 flex items-center justify-center transition-smooth text-white hover:text-cyan-400">
              <Linkedin size={20} />
            </a>
            <a href="mailto:marketing@thebumpteam.com" className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 flex items-center justify-center transition-smooth text-white hover:text-cyan-400">
              <Mail size={20} />
            </a>
          </div>

          <div className="text-center text-white">
            <p>@{new Date().getFullYear()} AI-Stacked.xyz. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;
