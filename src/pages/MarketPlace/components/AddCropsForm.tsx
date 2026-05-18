import { FormProvider, useForm } from 'react-hook-form';
import { CloseButton, Drawer, Portal } from '@chakra-ui/react';

import { AddCropFormValues } from '../types';
import FormFields from './FormFields';
import { useEffect } from 'react';
import { buildTheme } from '../util';
import { useAuth } from '@/context/AuthProvider';

interface AddCropsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingCrop?: any;
}

const AddCropsForm = (props: AddCropsFormProps) => {
  const { isOpen, onClose, onSubmit: formSubmit, editingCrop } = props;
  const { user } = useAuth();

  const form = useForm<AddCropFormValues>({
    defaultValues: {
      unit: 'kg',
      category: 'leafy',
      contact: '',
      facebook: '',
      location: '',
    },
  });

  useEffect(() => {
    if (editingCrop) {
      form.reset({
        name: editingCrop.name,
        variety: editingCrop.variety,
        quantity: editingCrop.quantity,
        price: editingCrop.price,
        unit: editingCrop.unit,
        category: editingCrop.category,
        seller: editingCrop.seller,
        contact: editingCrop.contact || '',
        facebook: editingCrop.facebook || '',
        location: editingCrop.location || '',
        latitude: editingCrop.latitude,
        longitude: editingCrop.longitude,
      });
    } else {
      form.reset({
        unit: 'kg',
        category: 'leafy',
        contact: '',
        facebook: '',
        location: '',
      });
    }
  }, [editingCrop, isOpen]);

  async function onSubmit(values: AddCropFormValues) {
    const theme = buildTheme(values.category);
    const payload = {
      name: values.name,
      variety: values.variety,
      quantity: values.quantity,
      price: values.price,
      unit: values.unit,
      category: values.category,
      seller: values.seller,
      contact: values.contact,
      facebook: values.facebook,
      location: values.location,
      latitude: values.latitude,
      longitude: values.longitude,
      emoji: theme.emoji,
      bg: theme.bg,
      avatar_bg: theme.avatarBg,
      avatar_color: theme.avatarColor,
      seller_id: user?.id,
    };
    formSubmit(payload);
    onClose();
  }

  const isEditing = !!editingCrop;

  return (
    <>
      <style>{`
        .agri-drawer [data-part="content"],
        .agri-drawer-content {
          background: #f5f0e8 !important;
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 100vh;
        }

        /* ── Header ─────────────────────────────── */
        .agri-header {
          background: linear-gradient(150deg, #243d17 0%, #2d4a1e 50%, #3a5f28 100%);
          padding: 22px 20px 26px 20px;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .agri-header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 140px; height: 140px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .agri-header::after {
          content: '';
          position: absolute;
          bottom: -25px; right: 60px;
          width: 90px; height: 90px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }

        .agri-header-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 10.5px;
          color: rgba(255,255,255,0.85);
          letter-spacing: 0.09em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .agri-header-title {
          margin: 0;
          font-size: 21px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .agri-header-sub {
          margin-top: 5px;
          font-size: 12px;
          color: rgba(255,255,255,0.6);
        }
        .agri-header-close {
          position: absolute !important;
          top: 14px; right: 14px;
          background: rgba(255,255,255,0.12) !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          color: white !important;
          border-radius: 8px !important;
          transition: background 0.15s !important;
        }
        .agri-header-close:hover {
          background: rgba(255,255,255,0.22) !important;
        }

        /* ── Body ─────────────────────────────── */
        .agri-body {
          flex: 1;
          overflow-y: auto;
          background: #f5f0e8;
          padding: 0;
        }

        /* ── Footer ─────────────────────────────── */
        .agri-footer {
          flex-shrink: 0;
          background: #f5f0e8;
          border-top: 1px solid #ddd5c0;
          padding: 14px 20px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .agri-btn-cancel {
          flex: 1;
          padding: 11px 16px;
          border-radius: 10px;
          border: 1.5px solid #c4b296;
          background: transparent;
          color: #5a4830;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .agri-btn-cancel:hover {
          background: #ede5d4;
          border-color: #9a8060;
        }
        .agri-btn-submit {
          flex: 2;
          padding: 11px 16px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #243d17, #3a5f28);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.02em;
          box-shadow: 0 3px 10px rgba(36,61,23,0.35);
          transition: all 0.15s;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .agri-btn-submit:hover {
          background: linear-gradient(135deg, #2d4a1e, #4a7a32);
          box-shadow: 0 5px 16px rgba(36,61,23,0.42);
          transform: translateY(-1px);
        }
        .agri-btn-submit:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(36,61,23,0.3);
        }
      `}</style>

      <Drawer.Root open={isOpen} onInteractOutside={onClose}>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content className="agri-drawer">
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f0e8' }}>

                {/* Header */}
                <div className="agri-header">
                  <div className="agri-header-pill">
                    {isEditing ? '✏️ Editing' : '🌱 New Listing'}
                  </div>
                  <h2 className="agri-header-title">
                    {isEditing ? 'Update Crop Listing' : 'Add Crop Listing'}
                  </h2>
                  <p className="agri-header-sub">
                    {isEditing
                      ? 'Modify your listing details below'
                      : 'Fill in your crop details to reach local buyers'}
                  </p>
                  <Drawer.CloseTrigger asChild>
                    <CloseButton size="sm" onClick={onClose} className="agri-header-close" />
                  </Drawer.CloseTrigger>
                </div>

                {/* Body */}
                <div className="agri-body">
                  <FormProvider {...form}>
                    <FormFields />
                  </FormProvider>
                </div>

                {/* Footer */}
                <div className="agri-footer">
                  <button className="agri-btn-cancel" onClick={onClose}>
                    Cancel
                  </button>
                  <button className="agri-btn-submit" onClick={form.handleSubmit(onSubmit)}>
                    {isEditing ? '✓ Update Listing' : '🌿 Post Listing'}
                  </button>
                </div>

              </div>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </>
  );
};

export default AddCropsForm;