import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';

const Footer: React.FC = () => {
  const footerSections = [
    {
      title: 'Product',
      links: [
        { label: 'Launch Token', href: '#', external: false },
        { label: 'Marketplace', href: '#', external: false },
        { label: 'Leaderboard', href: '#', external: false },
        { label: 'Analytics', href: '#', external: false },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '#', external: true },
        { label: 'API Reference', href: '#', external: true },
        { label: 'Tutorials', href: '#', external: true },
        { label: 'Community', href: '#', external: true },
      ],
    },
    {
      title: 'Socials',
      links: [
        { label: 'Twitter', href: '#', external: true },
        { label: 'Discord', href: '#', external: true },
        { label: 'Telegram', href: '#', external: true },
        { label: 'GitHub', href: '#', external: true },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '#', external: false },
        { label: 'Terms of Service', href: '#', external: false },
        { label: 'Cookie Policy', href: '#', external: false },
        { label: 'Disclaimer', href: '#', external: false },
      ],
    },
  ];

  return (
    <footer className="bg-background-card border-t border-background-elevated">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                <span className="text-background-dark font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-text-primary">SplitzFun</span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              SplitzFun routes attention into royalties. Launch, manage, and flip tokens like startups.
            </p>
            <div className="flex items-center space-x-2 text-text-muted text-sm">
              <Globe className="w-4 h-4" />
              <select className="bg-transparent border-none focus:outline-none focus:ring-0">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-text-primary font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-text-secondary hover:text-primary-mint transition-colors text-sm flex items-center space-x-1"
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                    >
                      <span>{link.label}</span>
                      {link.external && <ExternalLink className="w-3 h-3" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background-elevated mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-text-muted text-sm">
            © 2024 SplitzFun. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="text-text-muted text-sm">Built on Solana</span>
            <div className="w-2 h-2 rounded-full bg-primary-mint"></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
