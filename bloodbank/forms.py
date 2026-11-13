from django import forms
from django.contrib.auth.models import User
from django.utils import timezone
import datetime
from .models import (
    UserProfile, DonorProfile, Hospital, BloodRequest, 
    CampRegistration, BLOOD_GROUPS, URGENCY_LEVELS
)

class DonorSignupForm(forms.Form):
    """User Registration Form for Blood Donors"""
    username = forms.CharField(max_length=150, required=False, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Optional username'}))
    email = forms.EmailField(widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'name@example.com'}))
    password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Min. 6 chars'}))
    confirm_password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Repeat password'}))
    
    full_name = forms.CharField(max_length=150, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Rahul Sharma'}))
    blood_group = forms.ChoiceField(choices=BLOOD_GROUPS, widget=forms.Select(attrs={'class': 'form-select text-danger fw-bold'}))
    age = forms.IntegerField(min_value=18, max_value=65, initial=26, widget=forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Age (18-65)'}))
    gender = forms.ChoiceField(choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')], widget=forms.Select(attrs={'class': 'form-select'}))
    phone = forms.CharField(max_length=20, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+91 98XXX XXXXX'}))
    city = forms.CharField(max_length=100, initial="Jamshedpur", widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Jamshedpur'}))
    address = forms.CharField(required=False, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Locality / Area (e.g. Sakchi)'}))

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if username and User.objects.filter(username=username).exists():
            raise forms.ValidationError("Username already taken. Please choose another.")
        return username

    def clean(self):
        cleaned_data = super().clean()
        pw = cleaned_data.get('password')
        cpw = cleaned_data.get('confirm_password')
        if pw and cpw and pw != cpw:
            raise forms.ValidationError("Passwords do not match!")
        
        username = cleaned_data.get('username')
        email = cleaned_data.get('email')
        if not username and email:
            import re
            base = email.split('@')[0].lower()
            base = re.sub(r'[^a-zA-Z0-9_]', '_', base)
            candidate = base
            counter = 1
            while User.objects.filter(username=candidate).exists():
                candidate = f"{base}_{counter}"
                counter += 1
            cleaned_data['username'] = candidate
        return cleaned_data


class HospitalSignupForm(forms.Form):
    """User Registration Form for Hospitals & Healthcare Facilities"""
    username = forms.CharField(max_length=150, required=False, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Optional username'}))
    email = forms.EmailField(widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'hospital@example.com'}))
    password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Min. 6 chars'}))
    confirm_password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Repeat password'}))
    
    hospital_name = forms.CharField(max_length=200, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Hospital / Healthcare Name'}))
    category = forms.CharField(max_length=100, initial="Private Multi-Speciality", widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Private / Govt / CHC'}))
    locality = forms.CharField(max_length=100, initial="Jamshedpur", widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Locality (e.g. Bistupur, Sakchi)'}))
    address = forms.CharField(required=False, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Full Address'}))
    phone = forms.CharField(max_length=30, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+91 98XXX XXXXX'}))
    emergency_phone = forms.CharField(required=False, max_length=30, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': '24/7 Emergency Line'}))
    beds = forms.IntegerField(min_value=10, initial=100, widget=forms.NumberInput(attrs={'class': 'form-control'}))
    has_blood_bank = forms.BooleanField(required=False, initial=True, widget=forms.CheckboxInput(attrs={'class': 'form-check-input'}))
    blood_bank_status = forms.CharField(required=False, max_length=200, initial="Licensed Blood Bank & Transfusion Center", widget=forms.TextInput(attrs={'class': 'form-control'}))

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if username and User.objects.filter(username=username).exists():
            raise forms.ValidationError("Username already taken. Please choose another.")
        return username

    def clean(self):
        cleaned_data = super().clean()
        pw = cleaned_data.get('password')
        cpw = cleaned_data.get('confirm_password')
        if pw and cpw and pw != cpw:
            raise forms.ValidationError("Passwords do not match!")

        if not cleaned_data.get('blood_bank_status'):
            cleaned_data['blood_bank_status'] = "Licensed Blood Bank & Transfusion Center"

        username = cleaned_data.get('username')
        email = cleaned_data.get('email')
        if not username and email:
            import re
            base = email.split('@')[0].lower()
            base = re.sub(r'[^a-zA-Z0-9_]', '_', base)
            candidate = f"hosp_{base}"
            counter = 1
            while User.objects.filter(username=candidate).exists():
                candidate = f"hosp_{base}_{counter}"
                counter += 1
            cleaned_data['username'] = candidate
        return cleaned_data


class UserLoginForm(forms.Form):
    """Unified Login Form supporting Donors, Hospitals, and Administrators"""
    username = forms.CharField(widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Username or Email', 'autocomplete': 'username'}))
    password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Your Password', 'autocomplete': 'current-password'}))


class BloodRequestForm(forms.ModelForm):
    """Form to submit an emergency blood requisition"""
    district = forms.CharField(required=False, initial='East Singhbhum', widget=forms.HiddenInput())
    required_date = forms.DateField(
        required=False,
        input_formats=['%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d'],
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date', 'id': 'reqDate'})
    )

    class Meta:
        model = BloodRequest
        fields = [
            'patient_name', 'blood_group', 'units_needed', 'hospital', 
            'hospital_name', 'city', 'district', 'contact_person', 
            'contact_phone', 'urgency', 'required_date', 'case_detail'
        ]
        widgets = {
            'patient_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Full Patient Name', 'id': 'reqPatientName'}),
            'blood_group': forms.Select(attrs={'class': 'form-select', 'id': 'reqBloodGroup'}),
            'units_needed': forms.NumberInput(attrs={'class': 'form-control', 'min': 1, 'max': 20, 'id': 'reqUnits'}),
            'hospital': forms.Select(attrs={'class': 'form-select', 'id': 'reqHospitalSelect'}),
            'hospital_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Hospital Name', 'id': 'reqHospitalName'}),
            'city': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'City / Locality', 'id': 'reqCity'}),
            'district': forms.HiddenInput(),
            'contact_person': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Attendant / Doctor Name', 'id': 'reqContactPerson'}),
            'contact_phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+91 Phone Number', 'id': 'reqContactPhone'}),
            'urgency': forms.Select(attrs={'class': 'form-select', 'id': 'reqUrgency'}),
            'required_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date', 'id': 'reqDate'}),
            'case_detail': forms.Textarea(attrs={'class': 'form-control', 'rows': 2, 'placeholder': 'Diagnosis, Ward, Blood component requirements...', 'id': 'reqDetail'}),
        }

    def clean_district(self):
        district = self.cleaned_data.get('district')
        return district or 'East Singhbhum'

    def clean_required_date(self):
        d = self.cleaned_data.get('required_date')
        if not d:
            return timezone.now().date()
        return d

    def clean(self):
        cleaned_data = super().clean()
        if not cleaned_data.get('district'):
            cleaned_data['district'] = 'East Singhbhum'
        hospital = cleaned_data.get('hospital')
        if hospital:
            if not cleaned_data.get('hospital_name'):
                cleaned_data['hospital_name'] = hospital.name
            if not cleaned_data.get('city'):
                cleaned_data['city'] = hospital.locality
        return cleaned_data


class CampRegistrationForm(forms.ModelForm):
    """Quick Form for Camp Participation"""
    class Meta:
        model = CampRegistration
        fields = ['full_name', 'phone', 'blood_group']
        widgets = {
            'full_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Your Full Name'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Phone Number'}),
            'blood_group': forms.Select(attrs={'class': 'form-select'}),
        }
