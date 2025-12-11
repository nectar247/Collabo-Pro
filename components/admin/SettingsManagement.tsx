"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Mail, Bell, Key, Globe, Shield, CheckCircle, AlertCircle, HelpCircle, FileText } from 'lucide-react';
import { useSettings } from '@/lib/firebase/hooks';
import FAQManagement from './FAQManagement';
import AboutManagement from './aboutManagement';
import ContentPreloader from '../loaders/ContentPreloader';
import ContentErrorLoader from '../loaders/ContentErrorLoader';

interface SystemSettings {
  emailNotifications: {
    dealAlerts: boolean;
    weeklyNewsletter: boolean;
    adminNotifications: boolean;
  };
  apiKeys: {
    stripePublicKey: string;
    stripeSecretKey: string;
    googleAnalyticsId: string;
  };
  general: {
    siteName: string;
    siteUrl: string;
    supportEmail: string;
    supportPhone: string;
    supportAddress: string;
    maintenanceMode: boolean;
  };
  security: {
    requireEmailVerification: boolean;
    maxLoginAttempts: number;
    sessionTimeout: number;
  };
}

export default function SettingsManagement() {
    const { settings: dbSettings, loading, error, updateSettings } = useSettings();
    const [activeSection, setActiveSection] = useState<keyof SystemSettings>('general');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [successMessage, setSuccessMessage] = useState('Settings saved successfully')
    const [errorMessage, setErrorMessage] = useState('Error saving settings')
    const [localSettings, setLocalSettings] = useState<SystemSettings>({
      emailNotifications: {
        dealAlerts: false,
        weeklyNewsletter: false,
        adminNotifications: false,
      },
      apiKeys: {
        stripePublicKey: '',
        stripeSecretKey: '',
        googleAnalyticsId: '',
      },
      general: {
        siteName: '',
        siteUrl: '',
        supportEmail: '',
        supportPhone: '',
        supportAddress: '',
        maintenanceMode: false,
      },
      security: {
        requireEmailVerification: false,
        maxLoginAttempts: 5,
        sessionTimeout: 30,
      },
    });

    // Initialize local settings from database settings
    useEffect(() => {
      if (dbSettings) {
        setLocalSettings(dbSettings);
      }
    }, [dbSettings]);
  
    const handleSave = async () => {
        setSaveStatus('saving');
        try {
            if(!localSettings.general.siteName || !localSettings.general.siteUrl){
                setErrorMessage('All fields with * are required!');
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 2000);
                return false;
            }
            await updateSettings(localSettings);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    };
  
    const sections: { id: keyof SystemSettings; label: string; icon: any }[] = [
      { id: 'general', label: 'General', icon: Globe },
      { id: 'emailNotifications', label: 'Email Notifications', icon: Mail },
      { id: 'apiKeys', label: 'API Keys', icon: Key },
      { id: 'security', label: 'Security', icon: Shield }
    ];

    const renderToggleButton = (
        checked: boolean,
        onChange: (checked: boolean) => void,
        label: string
      ) => (
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-medium text-primary">{label}</span>
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full
              transition-colors duration-300
              ${checked ? 'bg-secondary' : 'bg-white/10'}
              focus:outline-none focus:ring-2 focus:ring-secondary/50
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white
                transition-transform duration-300
                ${checked ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
    );
    


    const renderGeneralSettings = () => (
      <div className="space-y-6">
        {/* Site Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Site Name <span className="text-red-500 text-xl">*</span>
          </label>
          <input
            type="text"
            value={localSettings.general.siteName}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                general: { ...localSettings.general, siteName: e.target.value }
              })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>
      
        {/* Site URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Site URL <span className="text-red-500 text-xl">*</span>
          </label>
          <input
            type="url"
            value={localSettings.general.siteUrl}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                general: { ...localSettings.general, siteUrl: e.target.value }
              })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>
      
        {/* Support Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Support Email
          </label>
          <input
            type="email"
            value={localSettings.general.supportEmail}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                general: { ...localSettings.general, supportEmail: e.target.value }
              })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>
      
        {/* Support Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Support Phone
          </label>
          <input
            type="text"
            value={localSettings.general.supportPhone}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                general: { ...localSettings.general, supportPhone: e.target.value }
              })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>
      
        {/* Support Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Support Address
          </label>
          <input
            type="text"
            value={localSettings.general.supportAddress}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                general: { ...localSettings.general, supportAddress: e.target.value }
              })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>
      
        {/* Maintenance Mode Toggle */}
        {renderToggleButton(
          localSettings.general.maintenanceMode,
          (checked) =>
            setLocalSettings({
              ...localSettings,
              general: { ...localSettings.general, maintenanceMode: checked }
            }),
          "Enable Maintenance Mode"
        )}
      </div>
    );
    
    const renderEmailSettings = () => (
      <div className="space-y-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {renderToggleButton(
          localSettings.emailNotifications.dealAlerts,
          (checked) =>
            setLocalSettings({
              ...localSettings,
              emailNotifications: {
                ...localSettings.emailNotifications,
                dealAlerts: checked,
              },
            }),
          "Send Deal Alert Emails"
        )}

        {renderToggleButton(
          localSettings.emailNotifications.weeklyNewsletter,
          (checked) =>
            setLocalSettings({
              ...localSettings,
              emailNotifications: {
                ...localSettings.emailNotifications,
                weeklyNewsletter: checked,
              },
            }),
          "Send Weekly Newsletter"
        )}

        {renderToggleButton(
          localSettings.emailNotifications.adminNotifications,
          (checked) =>
            setLocalSettings({
              ...localSettings,
              emailNotifications: {
                ...localSettings.emailNotifications,
                adminNotifications: checked,
              },
            }),
          "Send Admin Notifications"
        )}
      </div>
    );
    
    const renderApiSettings = () => (
      <div className="space-y-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {/* Stripe Public Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stripe Public Key
          </label>
          <input
            type="text"
            value={localSettings.apiKeys.stripePublicKey || ''}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                apiKeys: {
                  ...localSettings.apiKeys,
                  stripePublicKey: e.target.value,
                },
              })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>

        {/* Stripe Secret Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stripe Secret Key
          </label>
          <input
            type="password"
            value={localSettings.apiKeys.stripeSecretKey || ''}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                apiKeys: {
                  ...localSettings.apiKeys,
                  stripeSecretKey: e.target.value,
                },
              })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>

        {/* Google Analytics ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Google Analytics ID
          </label>
          <input
            type="text"
            value={localSettings.apiKeys.googleAnalyticsId || ''}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                apiKeys: {
                  ...localSettings.apiKeys,
                  googleAnalyticsId: e.target.value,
                },
              })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>
      </div>
    );
    
    const renderSecuritySettings = () => (
      <div className="space-y-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {/* Email Verification Toggle */}
        {renderToggleButton(
          localSettings.security.requireEmailVerification,
          (checked) =>
            setLocalSettings({
              ...localSettings,
              security: {
                ...localSettings.security,
                requireEmailVerification: checked,
              },
            }),
          "Require Email Verification"
        )}

        {/* Max Login Attempts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Login Attempts
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={localSettings.security.maxLoginAttempts || 5}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                security: {
                  ...localSettings.security,
                  maxLoginAttempts: parseInt(e.target.value),
                },
              })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>

        {/* Session Timeout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Timeout (minutes)
          </label>
          <input
            type="number"
            min="5"
            max="1440"
            value={localSettings.security.sessionTimeout || 30}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                security: {
                  ...localSettings.security,
                  sessionTimeout: parseInt(e.target.value),
                },
              })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>
      </div>
    );
  
    if (loading) {
      return (
        <ContentPreloader text="Loading Settings..." />
      );
    }
  
    if (error) {
      return (
        <ContentErrorLoader text='Error Loading Settings' message={error.message} />
      );
    }
  
    if (!localSettings) {
    //   return null;
    }

    return (
        <div className="space-y-6">
            {/* Section Tabs */}
            <div className="flex flex-wrap gap-4">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors shadow-sm text-sm font-medium ${
                    activeSection === section.id
                      ? 'bg-secondary text-white border-secondary'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <section.icon className="h-5 w-5" />
                  {section.label}
                </button>
              ))}
            </div>


            {/* Settings Content */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              {activeSection === 'general' && renderGeneralSettings()}
              {activeSection === 'emailNotifications' && renderEmailSettings()}
              {activeSection === 'apiKeys' && renderApiSettings()}
              {activeSection === 'security' && renderSecuritySettings()}
              {(activeSection) === 'faq' && <FAQManagement />}
              {(activeSection) === 'about' && <AboutManagement />}

              {/* Save Button - Only for non-FAQ/About */}
              {((activeSection) !== 'faq' && (activeSection) !== 'about') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 flex items-center justify-end gap-4"
                >
                  <AnimatePresence>
                    {saveStatus !== 'idle' && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-2"
                      >
                        {saveStatus === 'success' && (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="text-green-600 text-sm">{successMessage}</span>
                          </>
                        )}
                        {saveStatus === 'error' && (
                          <>
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <span className="text-red-600 text-sm">{errorMessage}</span>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Save Settings
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </div>

        </div>
    );
}