from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Handles user registration for CLIENT and TRANSPORTER roles.
    Returns JWT tokens on success (auto-login).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT tokens (auto-login)
            refresh = RefreshToken.for_user(user)
            
            # Add custom claims to token
            refresh['role'] = user.role
            refresh['is_verified'] = user.is_phone_verified
            
            return Response({
                'message': 'Registration successful.',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    POST /api/auth/login/
    Validates credentials and returns JWT tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Add custom claims
            refresh['role'] = user.role
            refresh['is_verified'] = user.is_phone_verified
            
            # Add trust status for transporters
            if user.role == 'TRANSPORTER':
                try:
                    refresh['trust_status'] = user.trust_profile.verification_status
                except:
                    refresh['trust_status'] = 'UNVERIFIED'
            
            return Response({
                'message': 'Login successful.',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    """
    GET /api/auth/profile/
    Returns current user profile.
    """
    def get(self, request):
        return Response({
            'user': UserProfileSerializer(request.user).data
        })
