-dontwarn javax.annotation.**
-dontwarn javax.inject.**

-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses

-keep class com.dice3d.app.MainActivity
-keep class com.dice3d.app.DiceBridge { *; }
-keep class com.dice3d.app.ThemeHelper
-keep class * extends androidx.appcompat.app.AppCompatActivity
-keep class * extends androidx.fragment.app.Fragment
-keep class * extends android.view.View
-keep class * extends android.widget.TextView

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keepclassmembers class * {
    void *(android.view.View);
    void *(android.view.ViewGroup);
}

-keepattributes JavascriptInterface

-keep class org.gradle.wrapper.GradleWrapperMain { *; }