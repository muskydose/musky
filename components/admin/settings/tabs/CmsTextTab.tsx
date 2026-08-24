'use client';

import React from 'react';
import { SiteSettings, CmsTextConfig } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import CmsTextEditor from '@/app/admin/settings/CmsTextEditor';

interface CmsTextTabProps {
  settings: SiteSettings;
  updateCmsField: (key: keyof CmsTextConfig, value: string) => void;
  handleResetCmsDefaults: () => void;
}

export default function CmsTextTab({
  settings,
  updateCmsField,
  handleResetCmsDefaults,
}: CmsTextTabProps) {
  const cmsText = getCmsText(settings);

  return (
    <div className="space-y-6">
      <CmsTextEditor
        cmsText={cmsText}
        updateCmsField={updateCmsField}
        handleResetCmsDefaults={handleResetCmsDefaults}
      />
    </div>
  );
}
