import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import type { TripResultDto } from '../api/dto';
import { useSendRequestForm } from './request/useSendRequestForm';
import { GoodsSection } from './request/GoodsSection';
import { PhotosSection } from './request/PhotosSection';
import { AddressSection } from './request/AddressSection';
import { ScheduleSection } from './request/ScheduleSection';
import { PriceSection } from './request/PriceSection';
import { requestStyles as s } from './request/requestStyles';

interface Props {
  trip: TripResultDto | null;
  onClose: () => void;
}

// Demande cliente sur un trajet retour. Ce composant se contente d'orchestrer :
// la logique vit dans useSendRequestForm, la validation dans requestSchema, et
// les champs dans les sections Goods/Photos/Address/Schedule/Price.
//
// Lot 6.1 — la feuille ne comptait que trois champs (prix, paiement, message
// libre), ce qui obligeait le transporteur à décider à l'aveugle.
export function SendRequestSheet({ trip, onClose }: Props) {
  const { t } = useTranslation();
  const f = useSendRequestForm(trip, onClose);

  return (
    <Modal
      visible={trip !== null}
      transparent
      animationType="slide"
      onRequestClose={f.close}
    >
      <Pressable style={s.backdrop} onPress={f.close}>
        {/* La feuille n'est PAS un Pressable. Un Pressable ancêtre capte le
            geste et le garde pendant tout le mouvement : le ScrollView
            intérieur ne reçoit jamais rien. Relevé sur appareil le 04/09 —
            créneau, prix, paiement et bouton d'envoi étaient absents de
            l'arbre d'accessibilité, donc la demande était impossible à
            envoyer. `onStartShouldSetResponder` suffit à empêcher le tap de
            remonter au fond, sans confisquer le glissement. */}
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          {f.isSuccess ? (
            <View style={s.successBox}>
              <Txt style={s.successText}>{t('search.request.success')}</Txt>
              <Button
                testID="send-request-close"
                label={t('common.close')}
                onPress={f.close}
                variant="primary"
              />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={s.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Txt style={s.title}>{t('search.request.title')}</Txt>

              <GoodsSection
                control={f.control}
                errors={f.errors}
                goodsOptions={f.goodsOptions}
                capaciteKg={trip?.available_capacity_kg ?? null}
                capaciteM3={trip?.available_capacity_m3 ?? null}
                erreurServeurChamp={f.erreurServeurChamp}
              />

              <PhotosSection
                photos={f.photos}
                photoError={f.photoError}
                pending={f.photoPending}
                peutAjouter={f.peutAjouterPhoto}
                onAjouter={() => void f.ajouterPhotos()}
                onRetirer={f.retirerPhoto}
              />

              <AddressSection
                control={f.control}
                errors={f.errors}
                govOptions={f.govOptions}
                setValue={f.setValue}
              />

              <ScheduleSection
                control={f.control}
                errors={f.errors}
                dayOptions={f.dayOptions}
                timeOptions={f.timeOptions}
                erreurServeurChamp={f.erreurServeurChamp}
              />

              <PriceSection
                control={f.control}
                errors={f.errors}
                methodOptions={f.methodOptions}
                erreurServeurChamp={f.erreurServeurChamp}
              />

              {f.erreurGenerale ? (
                <Txt testID="send-request-error" style={s.error}>
                  {f.erreurGenerale}
                </Txt>
              ) : null}

              <Button
                testID="send-request-submit"
                label={t('search.request.submit')}
                onPress={f.submit}
                variant="cta"
                loading={f.isPending}
              />
            </ScrollView>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}
