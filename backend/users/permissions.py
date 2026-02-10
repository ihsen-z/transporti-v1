from functools import wraps
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.exceptions import PermissionDenied


class IsOwnerOrReadOnly(BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` attribute.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True

        # Instance must have an attribute named `owner`.
        return obj.owner == request.user


class RequireRole(BasePermission):
    """
    DRF Permission class for role-based access control.
    Usage: permission_classes = [RequireRole.for_roles('CLIENT', 'ADMIN')]
    """
    allowed_roles = []

    @classmethod
    def for_roles(cls, *roles):
        """Factory method to create permission class for specific roles."""
        class RolePermission(cls):
            allowed_roles = list(roles)
        return RolePermission

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in self.allowed_roles


class RequireVerification(BasePermission):
    """
    DRF Permission class requiring TRANSPORTER to be VERIFIED.
    Used for offer submission and other trust-gated actions.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Only applies to transporters
        if request.user.role != 'TRANSPORTER':
            return True  # Non-transporters pass (guard doesn't apply)
        
        try:
            trust_profile = request.user.trust_profile
            return trust_profile.verification_status == 'VERIFIED'
        except:
            return False


class RequireOwner(BasePermission):
    """
    DRF Permission class for object-level ownership verification.
    Requires view to have get_object() and owner_field attribute.
    """
    owner_field = 'owner'  # Default field name

    @classmethod
    def for_field(cls, field_name):
        """Factory method to specify owner field name."""
        class OwnerPermission(cls):
            owner_field = field_name
        return OwnerPermission

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, self.owner_field, None)
        if owner is None:
            return False
        return owner == request.user


# Decorator versions for function-based views
def require_role(*roles):
    """
    Decorator for function-based views.
    Usage: @require_role('CLIENT', 'ADMIN')
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                raise PermissionDenied("Authentication required.")
            if request.user.role not in roles:
                raise PermissionDenied(f"Role {request.user.role} not authorized.")
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator


def require_verification(view_func):
    """
    Decorator requiring transporter verification.
    Usage: @require_verification
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied("Authentication required.")
        
        if request.user.role == 'TRANSPORTER':
            try:
                if request.user.trust_profile.verification_status != 'VERIFIED':
                    raise PermissionDenied("Transporter verification required to perform this action.")
            except:
                raise PermissionDenied("Trust profile not found.")
        
        return view_func(request, *args, **kwargs)
    return wrapped_view


def require_owner(owner_field='owner'):
    """
    Decorator for object ownership verification.
    Usage: @require_owner('owner')
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            # Actual ownership check happens in the view
            # This decorator sets up the requirement
            request._require_owner_field = owner_field
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator
