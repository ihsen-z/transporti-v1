import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, SafeAreaView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateJob } from '../../../src/features/jobs/api/jobApi';
import { useTheme } from '../../../src/core/theme/ThemeProvider';
import { colors, typography, spacing, radius } from '../../../src/core/theme/tokens';
import { AddressPicker } from '../../../src/shared/components/maps/AddressPicker';

export default function CreateJobScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { mutateAsync: createJob, isPending } = useCreateJob();

  const schema = z.object({
    job_type: z.enum(['TRANSPORT', 'MOVING', 'DELIVERY']),
    pickup_address: z.string().min(5, { message: 'Adresse de départ requise (min 5 caractères).' }),
    pickup_lat: z.number(),
    pickup_lng: z.number(),
    dropoff_address: z.string().min(5, { message: "Adresse d'arrivée requise (min 5 caractères)." }),
    dropoff_lat: z.number(),
    dropoff_lng: z.number(),
    scheduled_time: z.string().min(10, { message: 'Date de planification requise.' }),
    price_tnd_min: z.string().optional(),
    price_tnd_max: z.string().optional(),
    description: z.string().min(10, { message: 'Veuillez décrire le transport (min 10 caractères).' }),
    // Moving-specific fields
    rooms: z.string().optional(),
    volume: z.string().optional(),
    pickup_floor: z.string().optional(),
    pickup_elevator: z.enum(['YES', 'NO', 'TOO_SMALL']).optional(),
    dropoff_floor: z.string().optional(),
    dropoff_elevator: z.enum(['YES', 'NO', 'TOO_SMALL']).optional(),
    service_disassembly: z.boolean().optional(),
    service_packing: z.boolean().optional(),
    service_fragile: z.boolean().optional(),
    service_materials: z.boolean().optional(),
    helper_count: z.number().optional(),
    fragile_description: z.string().optional(),
  });

  type FormData = z.infer<typeof schema>;

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      job_type: 'TRANSPORT',
      pickup_address: '',
      pickup_lat: 36.8065,
      pickup_lng: 10.1815,
      dropoff_address: '',
      dropoff_lat: 35.8256,
      dropoff_lng: 10.6369,
      scheduled_time: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      price_tnd_min: '',
      price_tnd_max: '',
      description: '',
      rooms: 'S+1',
      volume: '',
      pickup_floor: '0',
      pickup_elevator: 'YES',
      dropoff_floor: '0',
      dropoff_elevator: 'YES',
      service_disassembly: false,
      service_packing: false,
      service_fragile: false,
      service_materials: false,
      helper_count: 1,
      fragile_description: '',
    },
  });

  const selectedType = watch('job_type');

  const onSubmit = async (data: FormData) => {
    try {
      const specs: any = {};
      if (data.job_type === 'MOVING') {
        specs.rooms = data.rooms;
        specs.volume = data.volume ? parseFloat(data.volume) : null;
        specs.pickup_floor = data.pickup_floor ? parseInt(data.pickup_floor, 10) : 0;
        specs.pickup_elevator = data.pickup_elevator;
        specs.dropoff_floor = data.dropoff_floor ? parseInt(data.dropoff_floor, 10) : 0;
        specs.dropoff_elevator = data.dropoff_elevator;
        specs.helper_count = data.helper_count;
        specs.services = {
          disassembly: !!data.service_disassembly,
          packing: !!data.service_packing,
          fragile: !!data.service_fragile,
          materials: !!data.service_materials,
        };
        if (data.service_fragile) {
          specs.fragile_description = data.fragile_description;
        }
      }

      const payload = {
        job_type: data.job_type,
        pickup_address: data.pickup_address,
        pickup_lat: data.pickup_lat,
        pickup_lng: data.pickup_lng,
        dropoff_address: data.dropoff_address,
        dropoff_lat: data.dropoff_lat,
        dropoff_lng: data.dropoff_lng,
        scheduled_time: new Date(data.scheduled_time).toISOString(),
        specifications: specs,
        price_tnd_min: data.price_tnd_min ? data.price_tnd_min : null,
        price_tnd_max: data.price_tnd_max ? data.price_tnd_max : null,
        description: data.description,
        photos: [],
        pickup_governorate: data.pickup_address.includes('Sfax') ? 'Sfax' : 'Tunis',
        dropoff_governorate: data.dropoff_address.includes('Sfax') ? 'Sfax' : 'Sousse',
        pickup_hint: '',
        dropoff_hint: '',
        is_return_trip: false,
        available_capacity: '',
      };

      await createJob(payload);
      Alert.alert('Succès', 'Votre annonce a été créée en mode brouillon.', [
        { text: 'OK', onPress: () => router.push('/(tabs)/jobs') },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de créer la mission.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Créer une annonce</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.typeContainer}>
          {(['TRANSPORT', 'MOVING', 'DELIVERY'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeTab,
                { backgroundColor: theme.colors.neutral[100] },
                selectedType === type && { backgroundColor: theme.colors.primary[500] },
              ]}
              onPress={() => setValue('job_type', type)}
            >
              <Text
                style={[
                  styles.typeTabText,
                  { color: theme.colors.text.secondary },
                  selectedType === type && { color: theme.colors.text.inverse, fontWeight: 'bold' },
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse de départ</Text>
          <Controller
            control={control}
            name="pickup_address"
            render={({ field: { onChange, value } }) => (
              <AddressPicker
                value={value}
                onValueChange={onChange}
                latitude={watch('pickup_lat')}
                longitude={watch('pickup_lng')}
                onCoordinatesChange={(lat, lng) => {
                  setValue('pickup_lat', lat);
                  setValue('pickup_lng', lng);
                }}
              />
            )}
          />
          {errors.pickup_address && <Text style={styles.errorText}>{errors.pickup_address.message}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse d'arrivée</Text>
          <Controller
            control={control}
            name="dropoff_address"
            render={({ field: { onChange, value } }) => (
              <AddressPicker
                value={value}
                onValueChange={onChange}
                latitude={watch('dropoff_lat')}
                longitude={watch('dropoff_lng')}
                onCoordinatesChange={(lat, lng) => {
                  setValue('dropoff_lat', lat);
                  setValue('dropoff_lng', lng);
                }}
              />
            )}
          />
          {errors.dropoff_address && <Text style={styles.errorText}>{errors.dropoff_address.message}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date prévue (AAAA-MM-JJ)</Text>
          <Controller
            control={control}
            name="scheduled_time"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.scheduled_time && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Ex: 2026-06-25"
                placeholderTextColor={theme.colors.text.disabled}
              />
            )}
          />
          {errors.scheduled_time && <Text style={styles.errorText}>{errors.scheduled_time.message}</Text>}
        </View>

        {selectedType === 'MOVING' && (
          <View style={[styles.section, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Détails du déménagement</Text>

            {/* Nombre de pièces */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de pièces</Text>
              <Controller
                control={control}
                name="rooms"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.roomsRow}>
                    {['S+0', 'S+1', 'S+2', 'S+3', 'S+4+'].map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.selectorButton,
                          { backgroundColor: theme.colors.neutral[100] },
                          value === opt && { backgroundColor: theme.colors.primary[500] },
                        ]}
                        onPress={() => onChange(opt)}
                      >
                        <Text
                          style={[
                            styles.selectorButtonText,
                            { color: theme.colors.text.secondary },
                            value === opt && { color: theme.colors.text.inverse, fontWeight: 'bold' },
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>

            {/* Volume */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Volume estimé (m³)</Text>
              <Controller
                control={control}
                name="volume"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="numeric"
                    placeholder="Ex: 15"
                    placeholderTextColor={theme.colors.text.disabled}
                  />
                )}
              />
            </View>

            {/* Accès Départ */}
            <Text style={styles.subTitle}>Accès au départ</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Étage</Text>
                <Controller
                  control={control}
                  name="pickup_floor"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.colors.text.disabled}
                    />
                  )}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.label}>Ascenseur</Text>
                <Controller
                  control={control}
                  name="pickup_elevator"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.elevatorRow}>
                      {[
                        { label: 'Oui', val: 'YES' },
                        { label: 'Non', val: 'NO' },
                        { label: 'Trop petit', val: 'TOO_SMALL' },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.val}
                          style={[
                            styles.elevatorButton,
                            { backgroundColor: theme.colors.neutral[100] },
                            value === item.val && { backgroundColor: theme.colors.primary[500] },
                          ]}
                          onPress={() => onChange(item.val)}
                        >
                          <Text
                            style={[
                              styles.elevatorButtonText,
                              { color: theme.colors.text.secondary },
                              value === item.val && { color: theme.colors.text.inverse, fontWeight: 'bold' },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                />
              </View>
            </View>

            {/* Accès Arrivée */}
            <Text style={styles.subTitle}>Accès à l'arrivée</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Étage</Text>
                <Controller
                  control={control}
                  name="dropoff_floor"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.colors.text.disabled}
                    />
                  )}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.label}>Ascenseur</Text>
                <Controller
                  control={control}
                  name="dropoff_elevator"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.elevatorRow}>
                      {[
                        { label: 'Oui', val: 'YES' },
                        { label: 'Non', val: 'NO' },
                        { label: 'Trop petit', val: 'TOO_SMALL' },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.val}
                          style={[
                            styles.elevatorButton,
                            { backgroundColor: theme.colors.neutral[100] },
                            value === item.val && { backgroundColor: theme.colors.primary[500] },
                          ]}
                          onPress={() => onChange(item.val)}
                        >
                          <Text
                            style={[
                              styles.elevatorButtonText,
                              { color: theme.colors.text.secondary },
                              value === item.val && { color: theme.colors.text.inverse, fontWeight: 'bold' },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                />
              </View>
            </View>

            {/* Manutentionnaires */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Manutentionnaires (aide au portage)</Text>
              <Controller
                control={control}
                name="helper_count"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.helpersRow}>
                    {[1, 2, 3, 4].map((count) => (
                      <TouchableOpacity
                        key={count}
                        style={[
                          styles.helperButton,
                          { backgroundColor: theme.colors.neutral[100] },
                          value === count && { backgroundColor: theme.colors.primary[500] },
                        ]}
                        onPress={() => onChange(count)}
                      >
                        <Text
                          style={[
                            styles.helperButtonText,
                            { color: theme.colors.text.secondary },
                            value === count && { color: theme.colors.text.inverse, fontWeight: 'bold' },
                          ]}
                        >
                          {count}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>

            {/* Services Optionnels */}
            <Text style={styles.subTitle}>Services additionnels</Text>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.colors.text.primary }]}>Démontage / Remontage de meubles</Text>
              <Controller
                control={control}
                name="service_disassembly"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[100] }}
                    thumbColor={value ? theme.colors.primary[500] : theme.colors.neutral[400]}
                  />
                )}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.colors.text.primary }]}>Aide à l'emballage</Text>
              <Controller
                control={control}
                name="service_packing"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[100] }}
                    thumbColor={value ? theme.colors.primary[500] : theme.colors.neutral[400]}
                  />
                )}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.colors.text.primary }]}>Matériel d'emballage fourni</Text>
              <Controller
                control={control}
                name="service_materials"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[100] }}
                    thumbColor={value ? theme.colors.primary[500] : theme.colors.neutral[400]}
                  />
                )}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.colors.text.primary }]}>Contient des objets fragiles</Text>
              <Controller
                control={control}
                name="service_fragile"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[100] }}
                    thumbColor={value ? theme.colors.primary[500] : theme.colors.neutral[400]}
                  />
                )}
              />
            </View>

            {watch('service_fragile') && (
              <View style={[styles.inputGroup, { marginTop: 12 }]}>
                <Text style={styles.label}>Liste / Description des objets fragiles</Text>
                <Controller
                  control={control}
                  name="fragile_description"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      multiline
                      numberOfLines={3}
                      placeholder="Décrivez les objets fragiles (miroir, verre, TV...)"
                      placeholderTextColor={theme.colors.text.disabled}
                    />
                  )}
                />
              </View>
            )}
          </View>
        )}

        <View style={styles.priceRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Budget min (TND)</Text>
            <Controller
              control={control}
              name="price_tnd_min"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  keyboardType="numeric"
                  placeholder="50"
                  placeholderTextColor={theme.colors.text.disabled}
                />
              )}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Budget max (TND)</Text>
            <Controller
              control={control}
              name="price_tnd_max"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  keyboardType="numeric"
                  placeholder="200"
                  placeholderTextColor={theme.colors.text.disabled}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description des objets</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                multiline
                numberOfLines={4}
                placeholder="Décrivez ce que vous souhaitez transporter, dimensions, fragilité..."
                placeholderTextColor={theme.colors.text.disabled}
              />
            )}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description.message}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.colors.primary[500] }]}
          onPress={handleSubmit(onSubmit)}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Enregistrer en Brouillon</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E8EAED',
    borderRadius: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  inputError: {
    borderColor: '#EA4335',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  priceRow: {
    flexDirection: 'row',
  },
  errorText: {
    fontSize: 11,
    color: '#EA4335',
    marginTop: 4,
  },
  submitButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  roomsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  selectorButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  selectorButtonText: {
    fontSize: 13,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
  },
  elevatorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  elevatorButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  elevatorButtonText: {
    fontSize: 12,
  },
  helpersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  helperButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  helperButtonText: {
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    minHeight: 44,
  },
  switchLabel: {
    fontSize: 13,
    flex: 1,
  },
});
