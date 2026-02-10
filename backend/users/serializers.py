from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Handles user registration for both CLIENT and TRANSPORTER roles.
    Auto-creates TrustProfile for transporters.
    """
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'}
    )
    role = serializers.ChoiceField(
        choices=[('CLIENT', 'Client'), ('TRANSPORTER', 'Transporter')],
        required=True
    )

    class Meta:
        model = User
        fields = ['email', 'phone', 'password', 'password_confirm', 'role', 'first_name', 'last_name']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def validate_phone(self, value):
        if value and User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Phone number already registered.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        
        try:
            validate_password(attrs['password'])
        except ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Generate username from email
        validated_data['username'] = validated_data['email'].split('@')[0]
        
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        # Auto-create TrustProfile for transporters
        if validated_data['role'] == 'TRANSPORTER':
            from trust.models import TrustProfile
            TrustProfile.objects.create(user=user)
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Validates login credentials.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').lower()
        password = attrs.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "No account found with this email."})

        if not user.check_password(password):
            raise serializers.ValidationError({"password": "Invalid password."})

        if not user.is_active:
            raise serializers.ValidationError({"email": "Account is deactivated."})

        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read-only user profile for token response.
    """
    verification_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'role', 'first_name', 'last_name', 
                  'is_phone_verified', 'verification_status']
        read_only_fields = fields

    def get_verification_status(self, obj):
        if obj.role == 'TRANSPORTER':
            try:
                return obj.trust_profile.verification_status
            except:
                return 'UNVERIFIED'
        return None


class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the nested Profile model.
    """
    class Meta:
        from .models import Profile
        model = Profile
        fields = ['avatar_url', 'language_pref', 'address_summary', 'bio']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user and nested profile data.
    """
    profile = ProfileSerializer()
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'profile']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update Profile fields
        # Note: Profile is auto-created, but handle case if missing
        try:
            profile = instance.profile
        except User.profile.RelatedObjectDoesNotExist:
            from .models import Profile
            profile = Profile.objects.create(user=instance)
            
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        
        return instance
