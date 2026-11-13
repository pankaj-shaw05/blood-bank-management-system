from .models import UserProfile, BloodInventory, BloodRequest, DonorProfile, Hospital

def global_context(request):
    """Provides common data to all templates (auth role, badges, notifications)"""
    context = {
        'user_role': None,
        'user_donor_profile': None,
        'user_hospital_profile': None,
        'is_donor': False,
        'is_hospital': False,
        'is_admin_role': False,
    }
    
    if request.user.is_authenticated:
        if request.user.is_superuser:
            context['user_role'] = 'ADMIN'
            context['is_admin_role'] = True
        else:
            try:
                profile = request.user.profile
                context['user_role'] = profile.role
                if profile.role == 'DONOR':
                    context['is_donor'] = True
                    try:
                        context['user_donor_profile'] = request.user.donor_profile
                    except:
                        pass
                elif profile.role == 'HOSPITAL':
                    context['is_hospital'] = True
                    try:
                        from .views import get_hospital_for_user
                        context['user_hospital_profile'] = get_hospital_for_user(request.user)
                    except:
                        context['user_hospital_profile'] = getattr(request.user, 'hospital_profile', None)
                elif profile.role == 'ADMIN':
                    context['is_admin_role'] = True
            except:
                pass
                
    try:
        from django.db.models import Sum
        total_units = BloodInventory.objects.aggregate(total=Sum('units'))['total'] or 0
        context['global_total_units'] = total_units
        context['global_emergency_count'] = BloodRequest.objects.filter(status='Urgent Needed').count()
    except:
        context['global_total_units'] = 0
        context['global_emergency_count'] = 0
        
    return context
