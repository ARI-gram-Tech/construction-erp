"""
Serializers for the accounts app.
"""
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'phone', 'first_name', 'last_name',
                  'is_active', 'is_superuser', 'company', 'role', 'must_change_password')
        read_only_fields = ('id', 'is_active', 'is_superuser', 'company', 'role', 'must_change_password')


class RoleChoiceSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Handles new user creation. Password is write-only and gets hashed
    via set_password — never stored or returned as plain text.
    """
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('email', 'username', 'phone', 'first_name', 'last_name', 'password')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
    

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.must_change_password = False
        user.save()
        return user

        
class UserManageSerializer(serializers.ModelSerializer):
    """
    Used by Super Admin to view/edit/create any user on the platform —
    unlike UserSerializer (read-only, used for 'me'), this allows
    editing role, active status, and company assignment.

    `password` is write-only and optional: required when Super Admin is
    creating a brand-new user (so the account is actually usable on
    save, unlike the old gap where a POST here left password unset),
    but never required on a PATCH — editing a user's role or company
    shouldn't force a password reset as a side effect.
    """
    password = serializers.CharField(
        write_only=True, required=False, min_length=8, allow_blank=False,
    )

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'phone', 'first_name', 'last_name',
            'is_active', 'is_superuser', 'company', 'role', 'password',
        )
        read_only_fields = ('id', 'is_superuser')

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError(
                {'password': 'A password is required when creating a new user.'}
            )
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user