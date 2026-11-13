from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.db.models import Sum, Q
from django.utils import timezone
import random
import json
import datetime
import io
import base64
import qrcode

from .models import (
    UserProfile, DonorProfile, Hospital, BloodInventory,
    BloodRequest, DonationCamp, CampRegistration, BloodDonationRecord,
    BLOOD_GROUPS
)
from .forms import (
    DonorSignupForm, HospitalSignupForm, UserLoginForm,
    BloodRequestForm, CampRegistrationForm
)


def generate_qr_base64(data_text):
    """Generate self-contained Base64 PNG Data URI for QR code that works 100% offline without external APIs"""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=6,
            border=1
        )
        qr.add_data(data_text)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('utf-8')
    except Exception:
        return ''



# ============================================================
# PUBLIC PAGES (ALL DATA DYNAMICALLY FETCHED FROM BACKEND)
# ============================================================

def home(request):
    """Dynamic Homepage with live database counters & real-time telemetry"""
    total_donors = DonorProfile.objects.filter(verified=True).count()
    total_hospitals = Hospital.objects.filter(verified_inside_geofence=True).count()
    total_units = BloodInventory.objects.aggregate(total=Sum('units'))['total'] or 0
    active_requests = BloodRequest.objects.filter(status='Urgent Needed')[:8]
    upcoming_camps = DonationCamp.objects.filter(status='Upcoming')[:3]
    inventory_items = BloodInventory.objects.all().order_by('blood_group')
    blood_groups = [bg[0] for bg in BLOOD_GROUPS]
    localities = ['Bistupur', 'Sakchi', 'Telco', 'Golmuri', 'Baridih', 'Jugsalai', 'Mango', 'Kadma', 'Sonari']

    context = {
        'total_donors': total_donors,
        'total_hospitals': total_hospitals,
        'total_units': total_units,
        'active_requests': active_requests,
        'upcoming_camps': upcoming_camps,
        'inventory_items': inventory_items,
        'blood_groups': blood_groups,
        'localities': localities,
    }
    return render(request, 'bloodbank/home.html', context)


def donors_list(request):
    """Search & Filter Donors strictly from Django database"""
    donors = DonorProfile.objects.filter(verified=True)

    # Filter parameters - clean '+' in blood groups
    blood_group = request.GET.get('blood_group', '').replace(' ', '+').strip()
    locality = request.GET.get('locality', '').strip()
    availability = request.GET.get('availability', '').strip()
    search_q = request.GET.get('q', '').strip()

    if blood_group and blood_group != 'ALL':
        donors = donors.filter(blood_group=blood_group)

    if locality and locality != 'ALL':
        donors = donors.filter(Q(city__icontains=locality) | Q(address__icontains=locality) | Q(district__icontains=locality))

    if availability == 'available':
        donors = donors.filter(is_available=True)

    if search_q:
        donors = donors.filter(
            Q(full_name__icontains=search_q) |
            Q(city__icontains=search_q) |
            Q(blood_group__iexact=search_q) |
            Q(phone__icontains=search_q)
        )

    total_count = donors.count()
    available_count = donors.filter(is_available=True).count()

    context = {
        'donors': donors,
        'total_count': total_count,
        'available_count': available_count,
        'selected_group': blood_group,
        'selected_locality': locality,
        'selected_availability': availability,
        'search_q': search_q,
        'blood_groups': [bg[0] for bg in BLOOD_GROUPS],
    }
    return render(request, 'bloodbank/donors.html', context)


def get_hospital_for_user(user):
    """Robustly resolve the Hospital record for any logged in hospital user (e.g. mgm, tata, etc.)"""
    if not user or not user.is_authenticated:
        return None
    
    # 1. Direct one-to-one relation
    hosp = getattr(user, 'hospital_profile', None)
    if hosp:
        return hosp
        
    # 2. Reverse lookup by user ForeignKey
    hosp = Hospital.objects.filter(user=user).first()
    if hosp:
        return hosp
        
    # 3. Match by username (case-insensitive, strip suffixes)
    uname = user.username.lower().replace('_hospital', '').replace('hospital', '').replace('_', '').strip()
    if uname:
        if 'mgm' in uname:
            hosp = Hospital.objects.filter(Q(hospital_id='HOSP-ES-02') | Q(name__icontains='MGM')).first()
            if hosp:
                return hosp
        if 'tata' in uname or 'tmh' in uname:
            hosp = Hospital.objects.filter(Q(hospital_id='HOSP-ES-01') | Q(name__icontains='Tata Main')).first()
            if hosp:
                return hosp
        hosp = Hospital.objects.filter(
            Q(name__icontains=uname) | Q(short_name__icontains=uname) | Q(hospital_id__icontains=uname)
        ).first()
        if hosp:
            return hosp

    # 4. Match by first_name / full name
    name_str = f"{user.first_name} {user.last_name}".strip()
    if name_str:
        if 'mgm' in name_str.lower():
            hosp = Hospital.objects.filter(Q(hospital_id='HOSP-ES-02') | Q(name__icontains='MGM')).first()
            if hosp:
                return hosp
        clean_name = name_str.replace("Hospital", "").replace("Medical", "").replace("College", "").strip()
        for word in clean_name.split():
            if len(word) >= 3:
                hosp = Hospital.objects.filter(Q(name__icontains=word) | Q(short_name__icontains=word)).first()
                if hosp:
                    return hosp

    # 5. Match by email
    if user.email:
        email_base = user.email.split('@')[0].lower()
        if 'mgm' in email_base:
            hosp = Hospital.objects.filter(Q(hospital_id='HOSP-ES-02') | Q(name__icontains='MGM')).first()
            if hosp:
                return hosp
        hosp = Hospital.objects.filter(Q(phone=user.email) | Q(name__icontains=email_base)).first()
        if hosp:
            return hosp

    # 6. If user profile role is HOSPITAL, fallback to associated or first verified hospital
    profile = getattr(user, 'profile', None)
    if profile and profile.role == 'HOSPITAL':
        hosp = Hospital.objects.filter(Q(name__icontains=user.username) | Q(locality__icontains=profile.city)).first()
        if hosp:
            return hosp
        return Hospital.objects.first()

    return None


def request_blood(request):
    """Request Blood Page with East Singhbhum Geofence Map & Working Form"""
    hospitals = Hospital.objects.filter(Q(verified_inside_geofence=True) | Q(user__isnull=False)).order_by('name')

    logged_in_hospital = None
    logged_in_donor = None
    if request.user.is_authenticated:
        logged_in_hospital = get_hospital_for_user(request.user)
        logged_in_donor = getattr(request.user, 'donor_profile', None)
        if not logged_in_donor:
            logged_in_donor = DonorProfile.objects.filter(user=request.user).first()

    # Query all active requisitions strictly from database
    urgency_filter = request.GET.get('urgency', 'ALL').strip()
    group_filter = request.GET.get('blood_group', 'ALL').replace(' ', '+').strip()
    status_filter = request.GET.get('status', '').strip()
    search_q = request.GET.get('q', '').strip()

    requests_qs = BloodRequest.objects.all().select_related('hospital').order_by('-created_at')
    if status_filter:
        requests_qs = requests_qs.filter(status=status_filter)
    else:
        # Exclude Cancelled requests from active emergency feed
        requests_qs = requests_qs.exclude(status='Cancelled')

    if urgency_filter and urgency_filter != 'ALL':
        requests_qs = requests_qs.filter(urgency__iexact=urgency_filter)
    if group_filter and group_filter != 'ALL':
        requests_qs = requests_qs.filter(blood_group=group_filter)
    if search_q:
        requests_qs = requests_qs.filter(
            Q(patient_name__icontains=search_q) |
            Q(hospital_name__icontains=search_q) |
            Q(request_code__icontains=search_q) |
            Q(city__icontains=search_q)
        )

    if request.method == 'POST':
        form = BloodRequestForm(request.POST)
        if form.is_valid():
            req_obj = form.save(commit=False)
            req_obj.request_code = f"REQ-{random.randint(1000, 9999)}"
            
            # If user is authenticated, link request
            if request.user.is_authenticated:
                req_obj.requested_by = request.user
            
            # If a hospital was selected from dropdown, ensure coordinates are linked
            if logged_in_hospital and not req_obj.hospital:
                req_obj.hospital = logged_in_hospital

            if req_obj.hospital:
                req_obj.hospital_name = req_obj.hospital.name
                req_obj.latitude = req_obj.hospital.latitude
                req_obj.longitude = req_obj.hospital.longitude
                req_obj.city = req_obj.hospital.locality
            elif not req_obj.hospital_name:
                req_obj.hospital_name = "Emergency Center, Jamshedpur"

            if not req_obj.district:
                req_obj.district = "East Singhbhum"

            req_obj.save()
            messages.success(
                request, 
                f"Emergency Blood Request #{req_obj.request_code} for {req_obj.patient_name} ({req_obj.blood_group}) successfully saved to database and broadcasted!"
            )
            referer = request.META.get('HTTP_REFERER', '')
            if 'dashboard/hospital' in referer or 'dashboard' in referer:
                return redirect('dashboard_hospital')
            return redirect('request_blood')
        else:
            err_details = "; ".join([f"{f}: {', '.join(e)}" for f, e in form.errors.items()])
            messages.error(request, f"Please check the form fields: {err_details}")
    else:
        # Pre-fill initial form fields based on logged-in user profile
        initial_data = {}
        if logged_in_hospital:
            initial_data = {
                'hospital': logged_in_hospital.id,
                'hospital_name': logged_in_hospital.name,
                'city': logged_in_hospital.locality,
                'contact_phone': logged_in_hospital.phone,
                'contact_person': f"{logged_in_hospital.short_name or logged_in_hospital.name} Duty Officer",
                'district': 'East Singhbhum',
                'urgency': 'Critical',
                'units_needed': 2,
            }
        # Notice: Donors do NOT prefill as the patient! Donors donate, they do not request blood for themselves.
        form = BloodRequestForm(initial=initial_data)

    context = {
        'form': form,
        'hospitals': hospitals,
        'hospitals_count': hospitals.count(),
        'recent_requests': requests_qs[:15],
        'total_requests_count': requests_qs.count(),
        'logged_in_hospital': logged_in_hospital,
        'logged_in_donor': logged_in_donor,
        'current_urgency': urgency_filter,
        'current_group': group_filter,
        'search_q': search_q,
    }
    return render(request, 'bloodbank/request_blood.html', context)


def inventory_view(request):
    """Live Blood Bank Component Inventory fetched from database"""
    items = BloodInventory.objects.all().order_by('blood_group')
    
    total_units = items.aggregate(total=Sum('units'))['total'] or 0
    total_red_cells = items.aggregate(total=Sum('red_cells'))['total'] or 0
    total_platelets = items.aggregate(total=Sum('platelets'))['total'] or 0
    total_plasma = items.aggregate(total=Sum('plasma'))['total'] or 0

    critical_count = sum(1 for i in items if i.units <= i.critical)

    context = {
        'items': items,
        'total_units': total_units,
        'total_red_cells': total_red_cells,
        'total_platelets': total_platelets,
        'total_plasma': total_plasma,
        'critical_count': critical_count,
    }
    return render(request, 'bloodbank/inventory.html', context)


def camps_view(request):
    """Donation Camps & Drives with working 1-click registration"""
    camps = DonationCamp.objects.all().order_by('date')
    form = CampRegistrationForm()

    context = {
        'camps': camps,
        'form': form,
        'total_camps': camps.count(),
    }
    return render(request, 'bloodbank/camps.html', context)


def register_camp(request, camp_id):
    """Handle Camp Registration POST"""
    camp = get_object_or_404(DonationCamp, id=camp_id)
    if request.method == 'POST':
        full_name = request.POST.get('full_name', '').strip()
        phone = request.POST.get('phone', '').strip()
        blood_group = request.POST.get('blood_group', 'O+')

        if full_name and phone:
            CampRegistration.objects.create(
                camp=camp,
                user=request.user if request.user.is_authenticated else None,
                full_name=full_name,
                phone=phone,
                blood_group=blood_group
            )
            camp.registered_count += 1
            camp.save()
            messages.success(request, f"Registration confirmed for {full_name} at {camp.title}! See you on {camp.date}.")
        else:
            messages.error(request, "Please provide your name and phone number.")

    return redirect('camps')


# ============================================================
# AUTHENTICATION (LOGIN, SIGNUP, LOGOUT, ROLE ROUTING)
# ============================================================

def login_view(request):
    """Unified login supporting Admin, Hospital, and Donor accounts with strict role validation"""
    if request.user.is_authenticated:
        return redirect('dashboard_redirect')

    if request.method == 'POST':
        form = UserLoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            submitted_role = request.POST.get('authRole', 'Donor').strip().upper()

            # Support login by username or email
            user = authenticate(request, username=username, password=password)
            if user is None:
                try:
                    user_obj = User.objects.get(email=username)
                    user = authenticate(request, username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass

            if user is not None:
                # Role Check Enforcement
                if not user.is_superuser:
                    user_role = getattr(getattr(user, 'profile', None), 'role', 'DONOR')
                    if user_role == 'ADMIN':
                        pass  # Admin can log in from either role selector
                    elif submitted_role == 'HOSPITAL' and user_role != 'HOSPITAL':
                        messages.error(
                            request,
                            "Role Mismatch: You selected 'Hospital / Clinic', but this account is registered as a 'Blood Donor'. Please select 'Blood Donor' to sign in."
                        )
                        return render(request, 'bloodbank/login.html', {'form': form, 'active_role': 'DONOR'})
                    elif submitted_role == 'DONOR' and user_role != 'DONOR':
                        messages.error(
                            request,
                            "Role Mismatch: You selected 'Blood Donor', but this account is registered as a 'Hospital Facility'. Please select 'Hospital / Clinic' to sign in."
                        )
                        return render(request, 'bloodbank/login.html', {'form': form, 'active_role': 'HOSPITAL'})

                login(request, user)
                messages.success(request, f"Welcome back, {user.first_name or user.username}!")
                return redirect('dashboard_redirect')
            else:
                messages.error(request, "Invalid username or password. Please try again.")
    else:
        form = UserLoginForm()

    return render(request, 'bloodbank/login.html', {'form': form})


def signup_view(request):
    """Registration for Donors and Hospitals"""
    if request.user.is_authenticated:
        return redirect('dashboard_redirect')

    role = request.GET.get('role', 'DONOR').upper()
    donor_form = DonorSignupForm()
    hospital_form = HospitalSignupForm()

    if request.method == 'POST':
        raw_role = (request.POST.get('role') or request.POST.get('role_type') or request.POST.get('signupRole') or 'DONOR').upper()
        submitted_role = 'HOSPITAL' if 'HOSP' in raw_role else 'DONOR'

        if submitted_role == 'DONOR':
            donor_form = DonorSignupForm(request.POST)
            if donor_form.is_valid():
                cd = donor_form.cleaned_data
                user = User.objects.create_user(
                    username=cd['username'],
                    email=cd['email'],
                    password=cd['password'],
                    first_name=cd['full_name'].split()[0],
                    last_name=" ".join(cd['full_name'].split()[1:]) if " " in cd['full_name'] else ""
                )
                UserProfile.objects.create(
                    user=user,
                    role='DONOR',
                    phone=cd['phone'],
                    city=cd['city']
                )
                DonorProfile.objects.create(
                    user=user,
                    full_name=cd['full_name'],
                    blood_group=cd['blood_group'],
                    age=cd['age'],
                    gender=cd['gender'],
                    phone=cd['phone'],
                    email=cd['email'],
                    city=cd['city'],
                    address=cd['address'],
                    is_available=True,
                    verified=True
                )
                login(request, user)
                messages.success(request, f"Welcome to LifeStream! Your donor account is now active.")
                return redirect('dashboard_donor')
            else:
                role = 'DONOR'
                messages.error(request, "Please correct the errors in the donor signup form.")

        elif submitted_role == 'HOSPITAL':
            hospital_form = HospitalSignupForm(request.POST)
            if hospital_form.is_valid():
                cd = hospital_form.cleaned_data
                user = User.objects.create_user(
                    username=cd['username'],
                    email=cd['email'],
                    password=cd['password'],
                    first_name=cd['hospital_name']
                )
                UserProfile.objects.create(
                    user=user,
                    role='HOSPITAL',
                    phone=cd['phone'],
                    city=cd['locality']
                )
                hosp_code = f"HOSP-ES-{random.randint(11, 99)}"
                Hospital.objects.create(
                    user=user,
                    hospital_id=hosp_code,
                    name=cd['hospital_name'],
                    category=cd['category'],
                    locality=cd['locality'],
                    address=cd['address'],
                    phone=cd['phone'],
                    emergency_phone=cd['emergency_phone'],
                    beds=cd['beds'],
                    has_blood_bank=cd['has_blood_bank'],
                    blood_bank_status=cd['blood_bank_status'],
                    latitude=22.8015,  # Default Jamshedpur center
                    longitude=86.1796,
                    verified_inside_geofence=True
                )
                login(request, user)
                messages.success(request, f"Welcome! Hospital portal account created for {cd['hospital_name']}.")
                return redirect('dashboard_hospital')
            else:
                role = 'HOSPITAL'
                messages.error(request, "Please correct the errors in the hospital signup form.")

    context = {
        'donor_form': donor_form,
        'hospital_form': hospital_form,
        'active_role': role,
    }
    return render(request, 'bloodbank/signup.html', context)


def logout_view(request):
    """User logout"""
    logout(request)
    messages.info(request, "You have been logged out successfully.")
    return redirect('home')


@login_required
def dashboard_redirect(request):
    """Intelligently routes the logged-in user to their respective dashboard"""
    if request.user.is_superuser:
        return redirect('dashboard_admin')
    
    try:
        profile = request.user.profile
        if profile.role == 'DONOR':
            return redirect('dashboard_donor')
        elif profile.role == 'HOSPITAL':
            return redirect('dashboard_hospital')
        elif profile.role == 'ADMIN':
            return redirect('dashboard_admin')
    except UserProfile.DoesNotExist:
        pass

    return redirect('dashboard_donor')


# ============================================================
# ROLE-BASED DASHBOARDS (DONOR, HOSPITAL, ADMIN)
# ============================================================

@login_required
def dashboard_donor(request):
    """Donor Personal Dashboard: History, Availability Toggle, Matching Requests"""
    # Enforce Role Check
    user_role = getattr(getattr(request.user, 'profile', None), 'role', 'DONOR')
    if user_role == 'HOSPITAL' and not request.user.is_superuser:
        messages.info(request, "You are signed in as a Hospital facility. Redirected to Hospital Portal.")
        return redirect('dashboard_hospital')

    try:
        donor = request.user.donor_profile
    except:
        # Create a fallback profile if needed
        donor, _ = DonorProfile.objects.get_or_create(
            user=request.user,
            defaults={
                'full_name': request.user.get_full_name() or request.user.username,
                'blood_group': 'O+',
                'phone': getattr(request.user.profile, 'phone', '9876543210'),
                'is_available': True
            }
        )

    # Emergency requests matching this donor's blood group
    matching_requests = BloodRequest.objects.filter(
        blood_group=donor.blood_group,
        status='Urgent Needed'
    )[:5]

    # My registered camps
    my_camps = CampRegistration.objects.filter(user=request.user).select_related('camp')

    # My donation history
    donation_history = BloodDonationRecord.objects.filter(donor=donor)

    # Dynamic Digital Donor Card Credentials
    donor_code = f"DONOR-ES-{donor.id:04d}"
    try:
        import socket
        local_ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        local_ip = '10.11.226.67'

    host = request.get_host()
    if '127.0.0.1' in host or 'localhost' in host:
        port = host.split(':')[1] if ':' in host else '8000'
        qr_verification_url = f"http://{local_ip}:{port}/donor/verify/{donor.id}/"
    else:
        qr_verification_url = request.build_absolute_uri(reverse('verify_donor_card', args=[donor.id]))

    # High-Contrast Fast-Scan Medical Credential for all mobile cameras
    status_str = "Eligible & Fit" if donor.is_eligible() else "Recovery Period"
    qr_payload = (
        f"LifeStream Verified Blood Donor\n"
        f"Name: {donor.full_name}\n"
        f"Blood: {donor.blood_group}\n"
        f"ID: {donor_code}\n"
        f"Status: {status_str}\n"
        f"East Singhbhum Health Authority\n"
        f"Verify URL: {qr_verification_url}"
    )
    qr_code_base64 = generate_qr_base64(qr_payload)

    issue_date = donor.created_at.strftime("%d %b %Y") if getattr(donor, 'created_at', None) else timezone.now().strftime("%d %b %Y")

    context = {
        'donor': donor,
        'donor_code': donor_code,
        'qr_verification_url': qr_verification_url,
        'qr_payload': qr_payload,
        'qr_code_base64': qr_code_base64,
        'issue_date': issue_date,
        'matching_requests': matching_requests,
        'my_camps': my_camps,
        'donation_history': donation_history,
        'days_until_eligible': donor.days_until_eligible(),
        'is_eligible': donor.is_eligible(),
    }
    return render(request, 'bloodbank/dashboard_donor.html', context)


@login_required
def pledge_donation(request):
    """Handles donor 'I Can Donate' pledge form submission and updates donor dashboard"""
    if request.method == 'POST':
        try:
            donor = request.user.donor_profile
        except Exception:
            donor, _ = DonorProfile.objects.get_or_create(
                user=request.user,
                defaults={
                    'full_name': request.user.get_full_name() or request.user.username,
                    'blood_group': 'O+',
                    'phone': getattr(getattr(request.user, 'profile', None), 'phone', '+91 98765 43210'),
                    'is_available': True
                }
            )

        request_id = request.POST.get('request_id')
        blood_req = BloodRequest.objects.filter(id=request_id).first() if request_id else None

        try:
            units = int(request.POST.get('units', 1))
        except (ValueError, TypeError):
            units = 1
        units = max(1, min(units, 5))

        date_str = request.POST.get('donation_date')
        if date_str:
            try:
                donation_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            except Exception:
                donation_date = timezone.now().date()
        else:
            donation_date = timezone.now().date()

        time_slot = request.POST.get('time_slot', 'Immediate Emergency')
        phone = request.POST.get('phone', donor.phone).strip() or donor.phone
        notes = request.POST.get('notes', '').strip()

        # Resolve hospital
        hospital = None
        if blood_req and blood_req.hospital:
            hospital = blood_req.hospital
        elif blood_req and blood_req.hospital_name:
            hospital = Hospital.objects.filter(name__icontains=blood_req.hospital_name.split(',')[0].strip()).first()
        elif request.POST.get('hospital_id'):
            h_id = request.POST.get('hospital_id')
            if str(h_id).isdigit():
                hospital = Hospital.objects.filter(id=int(h_id)).first()

        # Generate official certificate / pledge tracking code
        cert_code = f"NBTC-JH-{random.randint(10000, 99999)}"

        patient_info = f"Patient: {blood_req.patient_name} (Req #{blood_req.request_code})" if blood_req else "Voluntary Hospital Donation"
        hosp_info = f"at {hospital.name if hospital else (blood_req.hospital_name if blood_req else 'LifeStream Network')}"
        combined_notes = f"Pledged for {patient_info} {hosp_info}. Preferred Slot: {time_slot}. Contact Phone: {phone}. {notes}".strip()

        # 1. Create BloodDonationRecord
        BloodDonationRecord.objects.create(
            donor=donor,
            hospital=hospital,
            blood_group=donor.blood_group,
            units=units,
            donation_date=donation_date,
            certificate_code=cert_code,
            notes=combined_notes,
            status='Confirmed Pledge'
        )

        # 2. Update DonorProfile stats so dashboard immediately reflects progress
        donor.total_donations += units
        donor.last_donation_date = donation_date
        donor.save()

        # 3. If tied to a BloodRequest, update requisition status if needed
        if blood_req and blood_req.status == 'Urgent Needed':
            blood_req.status = 'In Progress'
            blood_req.save()

        messages.success(
            request,
            f"🎉 Thank you, {donor.full_name}! Your blood donation pledge of {units} unit(s) of {donor.blood_group} has been successfully recorded (Cert ID: {cert_code}). Your Donor Dashboard has been updated!"
        )
        return redirect('dashboard_donor')

    return redirect('dashboard_donor')


@login_required
def dashboard_hospital(request):
    """Hospital Portal: Requisition Tracking, Local Donors, In-House Status"""
    # Enforce Role Check
    user_role = getattr(getattr(request.user, 'profile', None), 'role', 'DONOR')
    if user_role == 'DONOR' and not request.user.is_superuser:
        messages.info(request, "You are signed in as a Voluntary Donor. Redirected to Donor Portal.")
        return redirect('dashboard_donor')

    hospital = get_hospital_for_user(request.user)

    if hospital:
        hosp_query = Q(hospital=hospital) | Q(requested_by=request.user)
        if hospital.short_name:
            hosp_query |= Q(hospital_name__icontains=hospital.short_name)
        clean_name = hospital.name.replace("Hospital", "").replace("Medical", "").replace("College", "").replace("Multispeciality", "").strip()
        for w in clean_name.split():
            if len(w) >= 3 and w.lower() not in ['and', 'the']:
                hosp_query |= Q(hospital_name__icontains=w)

        my_requests = BloodRequest.objects.filter(hosp_query).distinct().order_by('-created_at')
    else:
        my_requests = BloodRequest.objects.filter(requested_by=request.user).distinct().order_by('-created_at')

    urgent_count = my_requests.filter(status='Urgent Needed').count()
    fulfilled_count = my_requests.filter(status='Fulfilled').count()

    # Available donors in East Singhbhum
    available_donors = DonorProfile.objects.filter(is_available=True)[:6]

    # Quick requisition form
    req_form = BloodRequestForm()

    context = {
        'hospital': hospital,
        'my_requests': my_requests,
        'urgent_count': urgent_count,
        'fulfilled_count': fulfilled_count,
        'available_donors': available_donors,
        'req_form': req_form,
    }
    return render(request, 'bloodbank/dashboard_hospital.html', context)


@login_required
def dashboard_admin(request):
    """System-Wide Admin Command Dashboard"""
    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role == 'ADMIN')):
        messages.error(request, "Access restricted to System Administrators only.")
        return redirect('dashboard_redirect')

    total_donors = DonorProfile.objects.count()
    total_hospitals = Hospital.objects.count()
    total_requests = BloodRequest.objects.count()
    pending_requests = BloodRequest.objects.filter(status='Urgent Needed').count()
    
    total_inventory = BloodInventory.objects.aggregate(total=Sum('units'))['total'] or 0

    recent_requests = BloodRequest.objects.all().order_by('-created_at')[:25]
    inventory_items = BloodInventory.objects.all().order_by('blood_group')
    camps = DonationCamp.objects.all()

    # Dynamic Analytics & BI Data for Charts (Chart.js)
    chart_inv_labels = [item.blood_group for item in inventory_items]
    chart_inv_units = [item.units for item in inventory_items]
    chart_inv_critical = [item.critical for item in inventory_items]
    chart_red_cells = [item.red_cells for item in inventory_items]
    chart_platelets = [item.platelets for item in inventory_items]
    chart_plasma = [item.plasma for item in inventory_items]

    hosp_qs = Hospital.objects.all().order_by('-beds')[:8]
    chart_hosp_names = [h.short_name or h.name.split(',')[0] for h in hosp_qs]
    chart_hosp_beds = [h.beds for h in hosp_qs]
    chart_hosp_units = [h.available_units for h in hosp_qs]

    # Requisition Distribution by Urgency
    urgency_labels = ['Critical', 'High', 'Moderate', 'Low']
    urgency_counts = [
        BloodRequest.objects.filter(urgency='Critical').count(),
        BloodRequest.objects.filter(urgency='High').count(),
        BloodRequest.objects.filter(urgency='Moderate').count(),
        BloodRequest.objects.filter(urgency='Low').count(),
    ]

    context = {
        'total_donors': total_donors,
        'total_hospitals': total_hospitals,
        'total_requests': total_requests,
        'pending_requests': pending_requests,
        'total_inventory': total_inventory,
        'recent_requests': recent_requests,
        'inventory_items': inventory_items,
        'camps': camps,
        # Chart JSON Payloads
        'chart_inv_labels': json.dumps(chart_inv_labels),
        'chart_inv_units': json.dumps(chart_inv_units),
        'chart_inv_critical': json.dumps(chart_inv_critical),
        'chart_red_cells': json.dumps(chart_red_cells),
        'chart_platelets': json.dumps(chart_platelets),
        'chart_plasma': json.dumps(chart_plasma),
        'chart_hosp_names': json.dumps(chart_hosp_names),
        'chart_hosp_beds': json.dumps(chart_hosp_beds),
        'chart_hosp_units': json.dumps(chart_hosp_units),
        'chart_urgency_labels': json.dumps(urgency_labels),
        'chart_urgency_counts': json.dumps(urgency_counts),
    }
    return render(request, 'bloodbank/dashboard_admin.html', context)


def verify_donor_card(request, donor_id):
    """Public Medical Verification Portal for Scanned Digital Donor Smart Card"""
    donor = get_object_or_404(DonorProfile, id=donor_id)
    verification_time = timezone.now().strftime("%d %b %Y, %I:%M %p")
    donor_code = f"DONOR-ES-{donor.id:04d}"

    try:
        import socket
        local_ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        local_ip = '10.11.226.67'

    host = request.get_host()
    if '127.0.0.1' in host or 'localhost' in host:
        port = host.split(':')[1] if ':' in host else '8000'
        qr_verification_url = f"http://{local_ip}:{port}/donor/verify/{donor.id}/"
    else:
        qr_verification_url = request.build_absolute_uri(reverse('verify_donor_card', args=[donor.id]))

    status_str = "Eligible & Fit" if donor.is_eligible() else "Recovery Period"
    qr_payload = (
        f"LifeStream Government Verified Donor Certificate\n"
        f"Name: {donor.full_name}\n"
        f"Donor ID: {donor_code}\n"
        f"Blood Group: {donor.blood_group}\n"
        f"Status: {status_str}\n"
        f"East Singhbhum Health Authority\n"
        f"Verified: {verification_time}\n"
        f"URL: {qr_verification_url}"
    )
    qr_code_base64 = generate_qr_base64(qr_payload)

    context = {
        'donor': donor,
        'donor_code': donor_code,
        'verification_time': verification_time,
        'qr_verification_url': qr_verification_url,
        'qr_payload': qr_payload,
        'qr_code_base64': qr_code_base64,
        'is_eligible': donor.is_eligible(),
        'days_until_eligible': donor.days_until_eligible(),
    }
    return render(request, 'bloodbank/verify_donor.html', context)


def api_analytics(request):
    """REST API endpoint for real-time system analytics and BI charts"""
    inventory_items = BloodInventory.objects.all().order_by('blood_group')
    hospitals = Hospital.objects.all().order_by('-beds')[:8]

    data = {
        'success': True,
        'timestamp': timezone.now().isoformat(),
        'inventory': {
            'labels': [item.blood_group for item in inventory_items],
            'units': [item.units for item in inventory_items],
            'red_cells': [item.red_cells for item in inventory_items],
            'platelets': [item.platelets for item in inventory_items],
            'plasma': [item.plasma for item in inventory_items],
        },
        'hospitals': {
            'names': [h.short_name or h.name for h in hospitals],
            'beds': [h.beds for h in hospitals],
            'units': [h.available_units for h in hospitals],
        },
        'urgency_distribution': {
            'Critical': BloodRequest.objects.filter(urgency='Critical').count(),
            'High': BloodRequest.objects.filter(urgency='High').count(),
            'Moderate': BloodRequest.objects.filter(urgency='Moderate').count(),
            'Low': BloodRequest.objects.filter(urgency='Low').count(),
        },
        'kpis': {
            'total_donors': DonorProfile.objects.count(),
            'total_hospitals': Hospital.objects.count(),
            'total_inventory': BloodInventory.objects.aggregate(total=Sum('units'))['total'] or 0,
            'total_requests': BloodRequest.objects.count(),
            'pending_requests': BloodRequest.objects.filter(status='Urgent Needed').count(),
        }
    }
    return JsonResponse(data, json_dumps_params={'indent': 4})


# ============================================================
# AJAX / API ENDPOINTS
# ============================================================

@login_required
def toggle_donor_availability(request):
    """Live AJAX switch to toggle Donor Available status"""
    if request.method == 'POST':
        try:
            donor = request.user.donor_profile
            donor.is_available = not donor.is_available
            donor.save()
            return JsonResponse({
                'success': True,
                'is_available': donor.is_available,
                'status_text': 'Available for Emergency' if donor.is_available else 'Currently Off-Duty'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'error': 'POST required'}, status=405)


@login_required
def update_request_status(request, req_id):
    """Update status of a Blood Request (Fulfilled, Cancelled, In Progress)"""
    if request.method == 'POST':
        req_obj = get_object_or_404(BloodRequest, id=req_id)
        new_status = request.POST.get('status')
        if new_status:
            req_obj.status = new_status
            req_obj.save()
            messages.success(request, f"Request #{req_obj.request_code} status updated to {new_status}.")
        return redirect(request.META.get('HTTP_REFERER', 'home'))
    return redirect('home')


@login_required
def delete_blood_request(request, req_id):
    """Delete a blood request (allowed for administrators or the requesting hospital)"""
    if request.method == 'POST':
        req_obj = get_object_or_404(BloodRequest, id=req_id)
        is_admin = request.user.is_superuser or (getattr(request.user, 'profile', None) and request.user.profile.role == 'ADMIN')
        is_owner = (req_obj.requested_by == request.user) or (req_obj.hospital and req_obj.hospital.user == request.user)
        if is_admin or is_owner:
            code = req_obj.request_code
            patient = req_obj.patient_name
            req_obj.delete()
            messages.success(request, f"Requisition #{code} for {patient} has been permanently deleted.")
        else:
            messages.error(request, "Permission denied. Only hospital authorities or system administrators can delete this requisition.")
        return redirect(request.META.get('HTTP_REFERER', 'request_blood'))
    return redirect('request_blood')


def api_hospitals(request):
    """JSON API returning registered East Singhbhum hospitals from database"""
    hospitals = Hospital.objects.filter(Q(verified_inside_geofence=True) | Q(user__isnull=False)).order_by('name')
    data = []
    for h in hospitals:
        data.append({
            'id': h.hospital_id,
            'dbId': h.id,
            'name': h.name,
            'shortName': h.short_name or h.name,
            'category': h.category,
            'locality': h.locality,
            'address': h.address,
            'lat': h.latitude,
            'lon': h.longitude,
            'phone': h.phone,
            'emergencyPhone': h.emergency_phone,
            'beds': h.beds,
            'hasBloodBank': h.has_blood_bank,
            'bloodBankStatus': h.blood_bank_status,
            'availableUnits': h.available_units,
            'isRegistered': True,
            'username': h.user.username if h.user else None,
        })
    response = JsonResponse({'facilities': data, 'count': len(data)})
    response['Access-Control-Allow-Origin'] = '*'
    return response


def api_geofence(request):
    """JSON API returning East Singhbhum Polygon Boundary Coordinates"""
    from .data_defaults import EAST_SINGHBHUM_POLYGON
    response = JsonResponse({
        'type': 'Polygon',
        'district': 'East Singhbhum',
        'coordinates': EAST_SINGHBHUM_POLYGON
    })
    response['Access-Control-Allow-Origin'] = '*'
    return response


@csrf_exempt
def api_requests(request):
    """JSON API returning and creating live BloodRequest data strictly in database"""
    if request.method == 'OPTIONS':
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken'
        return response

    if request.method == 'POST':
        try:
            if request.content_type == 'application/json':
                body = json.loads(request.body.decode('utf-8') or '{}')
            else:
                body = request.POST.dict()

            p_name = body.get('patientName') or body.get('patient_name')
            b_group = body.get('bloodGroup') or body.get('blood_group') or 'O+'
            units = int(body.get('unitsNeeded') or body.get('units_needed') or 1)
            h_name = body.get('hospitalName') or body.get('hospital_name') or 'Verified Hospital'
            h_id = body.get('hospitalId') or body.get('hospital') or ''
            c_person = body.get('contactPerson') or body.get('contact_person') or 'Duty Coordinator'
            c_phone = body.get('contactPhone') or body.get('contact_phone') or '+91 657-222-0000'
            city = body.get('city') or 'Jamshedpur'
            district = body.get('district') or 'East Singhbhum'
            urgency = body.get('urgency') or 'Critical'
            c_detail = body.get('caseDetail') or body.get('case_detail') or ''
            req_date_str = body.get('requiredDate') or body.get('required_date')

            if req_date_str:
                try:
                    req_date = datetime.datetime.strptime(str(req_date_str), "%Y-%m-%d").date()
                except Exception:
                    req_date = timezone.now().date()
            else:
                req_date = timezone.now().date()

            hosp_obj = None
            if h_id:
                if str(h_id).isdigit():
                    hosp_obj = Hospital.objects.filter(id=int(h_id)).first()
                if not hosp_obj:
                    hosp_obj = Hospital.objects.filter(hospital_id=str(h_id)).first()
            if not hosp_obj and h_name:
                hosp_obj = Hospital.objects.filter(name__icontains=h_name.split(',')[0].strip()).first()

            new_req = BloodRequest.objects.create(
                request_code=f"REQ-{random.randint(1000, 9999)}",
                patient_name=p_name or 'Emergency Patient',
                blood_group=b_group,
                units_needed=units,
                hospital=hosp_obj,
                hospital_name=hosp_obj.name if hosp_obj else h_name,
                city=hosp_obj.locality if hosp_obj else city,
                district=district,
                latitude=hosp_obj.latitude if hosp_obj else 22.8015,
                longitude=hosp_obj.longitude if hosp_obj else 86.1796,
                contact_person=c_person,
                contact_phone=c_phone,
                urgency=urgency,
                required_date=req_date,
                case_detail=c_detail,
                status='Urgent Needed',
                requested_by=request.user if request.user.is_authenticated else None
            )

            res = JsonResponse({
                'status': 'success',
                'message': f'Blood request #{new_req.request_code} saved to database!',
                'request': {
                    'id': new_req.request_code,
                    'patientName': new_req.patient_name,
                    'bloodGroup': new_req.blood_group,
                    'unitsNeeded': new_req.units_needed,
                    'hospitalName': new_req.hospital_name,
                    'hospitalId': hosp_obj.hospital_id if hosp_obj else '',
                    'city': new_req.city,
                    'district': new_req.district,
                    'urgency': new_req.urgency,
                    'contactPerson': new_req.contact_person,
                    'contactPhone': new_req.contact_phone,
                    'caseDetail': new_req.case_detail,
                    'status': new_req.status,
                    'requiredDate': str(new_req.required_date),
                    'createdAt': new_req.created_at.strftime('%Y-%m-%d %H:%M')
                }
            }, status=201)
            res['Access-Control-Allow-Origin'] = '*'
            return res
        except Exception as e:
            res = JsonResponse({'status': 'error', 'message': str(e)}, status=400)
            res['Access-Control-Allow-Origin'] = '*'
            return res

    reqs = BloodRequest.objects.all().order_by('-created_at')[:30]
    data = []
    for r in reqs:
        data.append({
            'id': r.request_code,
            'patientName': r.patient_name,
            'bloodGroup': r.blood_group,
            'unitsNeeded': r.units_needed,
            'hospitalName': r.hospital_name,
            'hospitalId': r.hospital.hospital_id if r.hospital else '',
            'city': r.city,
            'district': r.district,
            'urgency': r.urgency,
            'contactPerson': r.contact_person,
            'contactPhone': r.contact_phone,
            'caseDetail': r.case_detail,
            'status': r.status,
            'requiredDate': str(r.required_date),
            'createdAt': r.created_at.strftime('%Y-%m-%d %H:%M'),
        })
    response = JsonResponse({'requests': data, 'count': len(data)})
    response['Access-Control-Allow-Origin'] = '*'
    return response


def favicon_view(request):
    """Dynamic SVG blood drop favicon to prevent 404s and brand the browser tab"""
    svg_icon = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M50 5 C50 5 15 50 15 72 A35 35 0 0 0 85 72 C85 50 50 5 50 5 Z" fill="#dc2626"/>
        <path d="M42 45 Q35 60 40 70 Q32 60 38 48 Z" fill="#ffffff" opacity="0.45"/>
    </svg>"""
    return HttpResponse(svg_icon.strip(), content_type="image/svg+xml")
