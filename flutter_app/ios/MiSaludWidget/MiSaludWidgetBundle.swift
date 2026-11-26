import WidgetKit
import SwiftUI

@main
struct MiSaludWidgetBundle: WidgetBundle {
    var body: some Widget {
        MiSaludResumenWidget()
        MiSaludPasosWidget()
        MiSaludSuenoWidget()
        MiSaludAguaWidget()
        MiSaludRachaWidget()
    }
}
