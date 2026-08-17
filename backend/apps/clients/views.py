"""
Views for the clients app. All views are scoped to the authenticated
user's own company — no user should ever see another company's clients.
"""
from rest_framework import viewsets, permissions

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """
    GET    /api/clients/            list this company's clients
    POST   /api/clients/            create a client for this company
    GET    /api/clients/{id}/       view one client
    PATCH  /api/clients/{id}/       edit a client
    DELETE /api/clients/{id}/       remove a client
    """
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        company = self.request.user.company
        if company is None:
            return Client.objects.none()
        return Client.objects.for_company(company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)