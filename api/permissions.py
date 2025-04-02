from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == 'ADMIN'

class IsEntreprise(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == 'ENTREPRISE'

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'ENTREPRISE':
            # Une entreprise peut gérer ses salaries
            if hasattr(obj, 'role') and obj.role == 'SALARIE':
                return obj.entreprise == request.user
            # Une entreprise peut gérer les visiteurs de ses salaries
            if hasattr(obj, 'role') and obj.role == 'VISITEUR':
                return obj.salarie and obj.salarie.entreprise == request.user
            # Pour les plans, permettre l'accès si l'entreprise est liée
            if hasattr(obj, 'entreprise'):
                return obj.entreprise == request.user
            # Pour les plans, permettre l'accès si le salarie appartient à l'entreprise
            if hasattr(obj, 'salarie') and obj.salarie:
                return obj.salarie.entreprise == request.user
        return False

class IsSalarie(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role in ['ADMIN', 'ENTREPRISE', 'SALARIE']

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'ENTREPRISE':
            return hasattr(obj, 'role') and obj.role in ['SALARIE', 'VISITEUR'] and \
                   ((obj.role == 'SALARIE' and obj.entreprise == request.user) or 
                    (obj.role == 'VISITEUR' and obj.salarie and obj.salarie.entreprise == request.user))
        return hasattr(obj, 'salarie') and obj.salarie == request.user and obj.role == 'VISITEUR'